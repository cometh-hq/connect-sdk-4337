import { isSafeOwner } from "@/core/accounts/safe/services/safe";
import type { API } from "@/core/services/API";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import CBOR from "cbor-js";
import elliptic from "elliptic";
import psl from "psl";
import type { ParsedDomain } from "psl";
import {
    type Address,
    type Chain,
    type Hex,
    encodeAbiParameters,
    hashMessage,
    keccak256,
    toBytes,
    toHex,
} from "viem";
import {
    NoPasskeySignerFoundForGivenChain,
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
    RetrieveWalletFromPasskeyError,
    SignerNotOwnerError,
} from "../../../errors";
import {
    extractClientDataFields,
    extractSignature,
    hexArrayStr,
    parseHex,
} from "../passkeys/utils";
import type { ComethSigner } from "../types";
import type {
    Assertion,
    PasskeyCredential,
    PasskeyLocalStorageFormat,
    WebAuthnSigner,
    webAuthnOptions,
} from "./types";

const EC = elliptic.ec;

const _formatCreatingRpId = (): { name: string; id?: string } => {
    const domain = (psl.parse(window.location.host) as ParsedDomain).domain;
    return domain
        ? {
              name: domain,
              id: domain,
          }
        : { name: "localhost" };
};

const _formatSigningRpId = (): string | undefined => {
    return (
        (psl.parse(window.location.host) as ParsedDomain).domain || undefined
    );
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

        const attestationObject =
            passkeyCredential?.response?.attestationObject;

        // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        let attestation: any;
        if (attestationObject instanceof ArrayBuffer) {
            attestation = CBOR.decode(attestationObject);
        } else {
            // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
            attestation = CBOR.decode((attestationObject as any).buffer);
        }

        const authData = parseAuthenticatorData(attestation.authData);

        const credentialPublicKeyBuffer = authData?.credentialPublicKey
            ?.buffer as ArrayBufferLike;

        const publicKey = CBOR.decode(credentialPublicKeyBuffer);
        const x = publicKey[-2];
        const y = publicKey[-3];
        const curve = new EC("p256");
        const point = curve.curve.point(x, y);

        const publicKeyX = `0x${point.getX().toString(16)}` as Hex;
        const publicKeyY = `0x${point.getY().toString(16)}` as Hex;
        const publicKeyId = hexArrayStr(passkeyCredential.rawId) as Hex;

        const signerAddress =
            safeWebAuthnSharedSignerAddress ??
            (await api.predictWebAuthnSignerAddress({
                publicKeyX: publicKeyX,
                publicKeyY: publicKeyY,
            }));

        // Create a PasskeyCredentialWithPubkeyCoordinates object
        const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
            id: publicKeyId,
            pubkeyCoordinates: {
                x: publicKeyX,
                y: publicKeyY,
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
            timeout: 60000,
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
    const storageKey = `cometh-connect-${smartAccountAddress}`;

    const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
        id: publicKeyId,
        pubkeyCoordinates: {
            x: publicKeyX,
            y: publicKeyY,
        },
        signerAddress,
    };

    window.localStorage.setItem(
        storageKey,
        JSON.stringify(passkeyWithCoordinates)
    );
};

const getPasskeyInStorage = (
    smartAccountAddress: Address
): PasskeyLocalStorageFormat | null => {
    const storageKey = `cometh-connect-${smartAccountAddress}`;
    const storedData = window.localStorage.getItem(storageKey);

    if (!storedData) return null;

    return JSON.parse(storedData);
};

const getPasskeySigner = async ({
    api,
    smartAccountAddress,
    chain,
    rpcUrl,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    safeModuleSetUpAddress,
    safeWebAuthnSharedSignerAddress,
    fallbackHandler,
    p256Verifier,
    multisendAddress,
}: {
    api: API;
    smartAccountAddress: Address;
    chain: Chain;
    rpcUrl?: string;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    safeModuleSetUpAddress: Address;
    safeWebAuthnSharedSignerAddress: Address;
    fallbackHandler: Address;
    p256Verifier: Address;
    multisendAddress: Address;
}): Promise<PasskeyLocalStorageFormat> => {
    /* Retrieve potentiel WebAuthn credentials in storage */
    const localStoragePasskey = getPasskeyInStorage(smartAccountAddress);

    if (localStoragePasskey) {
        const passkey = localStoragePasskey as PasskeyLocalStorageFormat;

        const comethSigner: ComethSigner = {
            type: "passkey",
            passkey: {
                id: passkey.id as Hex,
                pubkeyCoordinates: {
                    x: passkey.pubkeyCoordinates.x as Hex,
                    y: passkey.pubkeyCoordinates.y as Hex,
                },
                signerAddress: passkey.signerAddress as Address,
            },
        };

        const isOwner = await isSafeOwner({
            safeAddress: smartAccountAddress,
            comethSigner,
            chain,
            rpcUrl,
            safeProxyFactoryAddress,
            safeSingletonAddress,
            safeModuleSetUpAddress,
            sharedWebAuthnSignerContractAddress:
                safeWebAuthnSharedSignerAddress,
            modules: [fallbackHandler],
            fallbackHandler,
            p256Verifier,
            multisendAddress,
        });

        if (!isOwner) throw new SignerNotOwnerError();

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

    const signingWebAuthnSigners = await api.getPasskeySignerByPublicKeyId(
        webAuthnSignature.publicKeyId as Hex
    );

    const webAuthnSignerForGivenChain = signingWebAuthnSigners.find(
        (signer) => +signer.chainId === chain.id
    );
    if (!webAuthnSignerForGivenChain)
        throw new NoPasskeySignerFoundForGivenChain();

    const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
        id: webAuthnSignerForGivenChain.publicKeyId as Hex,
        pubkeyCoordinates: {
            x: webAuthnSignerForGivenChain.publicKeyX as Hex,
            y: webAuthnSignerForGivenChain.publicKeyY as Hex,
        },
        signerAddress: webAuthnSignerForGivenChain.signerAddress as Address,
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
    API: API,
    chain: Chain
): Promise<Address> => {
    let publicKeyId: Hex;

    try {
        publicKeyId = (await signWithPasskey("Retrieve user wallet"))
            .publicKeyId as Hex;
    } catch {
        throw new RetrieveWalletFromPasskeyError();
    }

    const signingPasskeySigners =
        await API.getPasskeySignerByPublicKeyId(publicKeyId);
    if (signingPasskeySigners.length == 0)
        throw new NoPasskeySignerFoundInDBError();

    const webAuthnSignerForGivenChain = signingPasskeySigners.find(
        (signer) => +signer.chainId === chain.id
    );
    if (!webAuthnSignerForGivenChain)
        throw new NoPasskeySignerFoundForGivenChain();

    const { smartAccountAddress, publicKeyX, publicKeyY, signerAddress } =
        signingPasskeySigners[0];

    setPasskeyInStorage(
        smartAccountAddress as Address,
        publicKeyId,
        publicKeyX as Hex,
        publicKeyY as Hex,
        signerAddress as Address
    );

    return smartAccountAddress as Address;
};

const retrieveSmartAccountAddressFromPasskeyId = async ({
    API,
    id,
    chain,
}: { API: API; id: string; chain: Chain }): Promise<Address> => {
    const publicKeyCredentials = [
        {
            id: parseHex(id),
            type: "public-key",
        },
    ] as PublicKeyCredentialDescriptor[];

    let publicKeyId: Hex;

    try {
        publicKeyId = (
            await sign(
                keccak256(hashMessage("Retrieve user wallet")),
                publicKeyCredentials
            )
        ).publicKeyId as Hex;
    } catch {
        throw new RetrieveWalletFromPasskeyError();
    }

    const signingPasskeySigners =
        await API.getPasskeySignerByPublicKeyId(publicKeyId);
    if (signingPasskeySigners.length == 0)
        throw new NoPasskeySignerFoundInDBError();

    const webAuthnSignerForGivenChain = signingPasskeySigners.find(
        (signer) => +signer.chainId === chain.id
    );
    if (!webAuthnSignerForGivenChain)
        throw new NoPasskeySignerFoundForGivenChain();

    const { smartAccountAddress, publicKeyX, publicKeyY, signerAddress } =
        signingPasskeySigners[0];

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
    retrieveSmartAccountAddressFromPasskeyId,
};
