import * as psl from "psl";
import {
    type Address,
    type Hex,
    encodeAbiParameters,
    hashMessage,
    keccak256,
    toBytes,
    toHex,
} from "viem";
import {
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
    RetrieveWalletFromPasskeyError,
    SignerNotOwnerError,
} from "../../../errors";
import type { API } from "../../services/API";
import {
    extractClientDataFields,
    extractSignature,
    hexArrayStr,
    parseHex,
} from "../passkeys/utils";
import type {
    Assertion,
    PasskeyCredential,
    PasskeyLocalStorageFormat,
    WebAuthnSigner,
    webAuthnOptions,
} from "./types";

const _formatCreatingRpId = (): { name: string; id?: string } => {
    return (psl.parse(window.location.host) as any).domain
        ? {
              name: (psl.parse(window.location.host) as any).domain,
              id: (psl.parse(window.location.host) as any).domain,
          }
        : { name: "localhost" };
};

const _formatSigningRpId = (): string | undefined => {
    return (psl.parse(window.location.host) as any).domain || undefined;
};

const createPasskeySigner = async ({
    api,
    webAuthnOptions,
    passKeyName,
    safeWebAuthnSharedSignerAddress,
}: {
    api: API;
    webAuthnOptions: webAuthnOptions;
    passKeyName?: string;
    safeWebAuthnSharedSignerAddress?: Address;
}): Promise<PasskeyLocalStorageFormat> => {
    try {
        const name = passKeyName || "Cometh Connect";
        const authenticatorSelection = webAuthnOptions?.authenticatorSelection;
        const extensions = webAuthnOptions?.extensions;

        const passkeyCredential = (await navigator.credentials.create({
            publicKey: {
                rp: _formatCreatingRpId(),
                user: {
                    id: crypto.getRandomValues(new Uint8Array(32)),
                    name,
                    displayName: name,
                },
                attestation: "none",
                authenticatorSelection,
                timeout: 60000,
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },
                    { alg: -257, type: "public-key" },
                ],
                extensions,
            },
        })) as PasskeyCredential;

        if (!passkeyCredential) {
            throw new Error(
                "Failed to generate passkey. Received null as a credential"
            );
        }

        const publicKeyAlgorithm =
            passkeyCredential.response.getPublicKeyAlgorithm();

        // Import the public key to later export it to get the XY coordinates
        const key = await crypto.subtle.importKey(
            "spki",
            passkeyCredential.response.getPublicKey(),
            {
                name: "ECDSA",
                namedCurve: "P-256",
                hash: { name: "SHA-256" },
            },
            true, // boolean that marks the key as an exportable one
            ["verify"]
        );

        // Export the public key in JWK format and extract XY coordinates
        const exportedKeyWithXYCoordinates = await crypto.subtle.exportKey(
            "jwk",
            key
        );

        if (
            !(exportedKeyWithXYCoordinates.x && exportedKeyWithXYCoordinates.y)
        ) {
            throw new Error("Failed to retrieve x and y coordinates");
        }

        const publicKeyId = hexArrayStr(passkeyCredential.rawId) as Hex;
        const x = `0x${Buffer.from(
            exportedKeyWithXYCoordinates.x,
            "base64"
        ).toString("hex")}` as Hex;
        const y = `0x${Buffer.from(
            exportedKeyWithXYCoordinates.y,
            "base64"
        ).toString("hex")}` as Hex;

        const signerAddress =
            safeWebAuthnSharedSignerAddress ??
            (await api.predictWebAuthnSignerAddress({
                publicKeyX: x,
                publicKeyY: y,
            }));

        // Create a PasskeyCredentialWithPubkeyCoordinates object
        const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
            id: publicKeyId,
            pubkeyCoordinates: {
                x,
                y,
            },
            publicKeyAlgorithm,
            signerAddress,
        };

        return passkeyWithCoordinates;
    } catch {
        throw new Error("Error in the passkey creation");
    }
};

const sign = async (
    challenge: string,
    publicKeyCredential?: PublicKeyCredentialDescriptor[]
): Promise<{ signature: Hex; publicKeyId: Hex }> => {
    const assertion = (await navigator.credentials.get({
        publicKey: {
            challenge: toBytes(challenge),
            rpId: _formatSigningRpId(),
            allowCredentials: publicKeyCredential || [],
            userVerification: "required",
            timeout: 30000,
        },
    })) as Assertion | null;

    if (!assertion) throw new Error("Passkey signature failed");

    const signature = encodeAbiParameters(
        [
            { type: "bytes", name: "authenticatorData" },
            { type: "bytes", name: "clientDataFields" },
            { type: "uint256[2]", name: "signature" },
        ],
        [
            toHex(new Uint8Array(assertion.response.authenticatorData)),
            extractClientDataFields(assertion.response) as Hex,
            extractSignature(assertion.response),
        ]
    );

    const publicKeyId = hexArrayStr(assertion.rawId) as Hex;

    return { signature, publicKeyId };
};

const signWithPasskey = async (
    challenge: string,
    webAuthnSigners?: WebAuthnSigner[]
): Promise<{ signature: Hex; publicKeyId: Hex }> => {
    let publicKeyCredentials: PublicKeyCredentialDescriptor[] | undefined;

    if (webAuthnSigners) {
        publicKeyCredentials = webAuthnSigners.map((webAuthnSigner) => {
            return {
                id: parseHex(webAuthnSigner.publicKeyId),
                type: "public-key",
            };
        });
    }

    const webAuthnSignature = await sign(
        keccak256(hashMessage(challenge)),
        publicKeyCredentials
    );

    return webAuthnSignature;
};

const setPasskeyInStorage = (
    smartAccountAddress: Address,
    publicKeyId: Hex,
    publicKeyX: Hex,
    publicKeyY: Hex,
    signerAddress: Address
): void => {
    const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
        id: publicKeyId,
        pubkeyCoordinates: {
            x: publicKeyX,
            y: publicKeyY,
        },
        signerAddress,
    };

    const localStoragePasskey = JSON.stringify(passkeyWithCoordinates);
    window.localStorage.setItem(
        `cometh-connect-${smartAccountAddress}`,
        localStoragePasskey
    );
};

const getPasskeyInStorage = (smartAccountAddress: Address): string | null => {
    return window.localStorage.getItem(`cometh-connect-${smartAccountAddress}`);
};

const getPasskeySigner = async ({
    api,
    smartAccountAddress,
}: {
    api: API;
    smartAccountAddress: Address;
}): Promise<PasskeyLocalStorageFormat> => {
    /* Retrieve potentiel WebAuthn credentials in storage */
    const localStoragePasskey = getPasskeyInStorage(smartAccountAddress);

    if (localStoragePasskey) {
        const passkey = JSON.parse(
            localStoragePasskey
        ) as PasskeyLocalStorageFormat;
        /* Check if storage WebAuthn credentials exists in db */
        const registeredPasskeySigner = await api.getPasskeySignerByPublicKeyId(
            passkey.id
        );

        if (!registeredPasskeySigner) throw new SignerNotOwnerError();

        return passkey;
    }

    const passkeySigners =
        await api.getPasskeySignersByWalletAddress(smartAccountAddress);

    if (passkeySigners.length === 0) throw new NoPasskeySignerFoundInDBError();

    //If no local storage or no match in db, Call Webauthn API to get current signer
    let webAuthnSignature: { signature: Hex; publicKeyId: Hex };
    try {
        webAuthnSignature = await signWithPasskey(
            "SDK Connection",
            passkeySigners as WebAuthnSigner[]
        );
    } catch {
        throw new NoPasskeySignerFoundInDeviceError();
    }

    const signingWebAuthnSigner = await api.getPasskeySignerByPublicKeyId(
        webAuthnSignature.publicKeyId as Hex
    );

    const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
        id: signingWebAuthnSigner.publicKeyId as Hex,
        pubkeyCoordinates: {
            x: signingWebAuthnSigner.publicKeyX as Hex,
            y: signingWebAuthnSigner.publicKeyY as Hex,
        },
        signerAddress: signingWebAuthnSigner.signerAddress as Address,
    };

    setPasskeyInStorage(
        smartAccountAddress,
        passkeyWithCoordinates.id,
        passkeyWithCoordinates.pubkeyCoordinates.x,
        passkeyWithCoordinates.pubkeyCoordinates.y,
        passkeyWithCoordinates.signerAddress
    );

    return passkeyWithCoordinates;
};

const retrieveSmartAccountAddressFromPasskey = async (
    API: API
): Promise<Address> => {
    let publicKeyId: Hex;

    try {
        publicKeyId = (await signWithPasskey("Retrieve user wallet"))
            .publicKeyId as Hex;
    } catch {
        throw new RetrieveWalletFromPasskeyError();
    }

    const signingPasskeySigner =
        await API.getPasskeySignerByPublicKeyId(publicKeyId);
    if (!signingPasskeySigner) throw new NoPasskeySignerFoundInDBError();

    const {
        walletAddress: smartAccountAddress,
        publicKeyX,
        publicKeyY,
        signerAddress,
    } = signingPasskeySigner;

    setPasskeyInStorage(
        smartAccountAddress as Address,
        publicKeyId,
        publicKeyX as Hex,
        publicKeyY as Hex,
        signerAddress as Address
    );

    return smartAccountAddress as Address;
};

export {
    createPasskeySigner,
    getPasskeyInStorage,
    getPasskeySigner,
    setPasskeyInStorage,
    sign,
    retrieveSmartAccountAddressFromPasskey,
};
