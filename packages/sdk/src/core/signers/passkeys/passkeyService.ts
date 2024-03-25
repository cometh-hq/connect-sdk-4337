import { type Hex, hashMessage, keccak256, toBytes } from "viem";
import {
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
    SignerNotOwnerError,
} from "../../../errors";
import type { API } from "../../services/API";
import {
    challengePrefix,
    hexArrayStr,
    parseHex,
    rpId,
} from "../passkeys/utils";
import type {
    Assertion,
    PasskeyCredential,
    PasskeyLocalStorageFormat,
    WebAuthnSignature,
    WebAuthnSigner,
    webAuthnOptions,
} from "./types";
import * as utils from "./utils";

const createPasskeySigner = async (
    webAuthnOptions: webAuthnOptions,
    passKeyName?: string
): Promise<PasskeyLocalStorageFormat> => {
    try {
        const name = passKeyName || "Cometh Connect";
        const authenticatorSelection = webAuthnOptions?.authenticatorSelection;
        const extensions = webAuthnOptions?.extensions;

        const passkeyCredential = (await navigator.credentials.create({
            publicKey: {
                rp: rpId,
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

        const publicKeyId = hexArrayStr(passkeyCredential.rawId);

        // Create a PasskeyCredentialWithPubkeyCoordinates object
        const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
            id: publicKeyId,
            pubkeyCoordinates: {
                x: `0x${Buffer.from(
                    exportedKeyWithXYCoordinates.x,
                    "base64"
                ).toString("hex")}` as Hex,
                y: `0x${Buffer.from(
                    exportedKeyWithXYCoordinates.y,
                    "base64"
                ).toString("hex")}}` as Hex,
            },
            publicKeyAlgorithm,
        };

        return passkeyWithCoordinates;
    } catch (err) {
        console.log(err);
        throw new Error("Error in the passkey creation");
    }
};

const sign = async (
    challenge: string,
    publicKeyCredential?: PublicKeyCredentialDescriptor[]
): Promise<WebAuthnSignature> => {
    const assertion = (await navigator.credentials.get({
        publicKey: {
            challenge: toBytes(challenge),
            allowCredentials: publicKeyCredential || [],
            userVerification: "required",
            timeout: 30000,
        },
    })) as Assertion | null;

    if (!assertion) throw new Error("Passkey signature failed");

    const rs = utils.derToRS(new Uint8Array(assertion.response.signature));

    const challengeOffset = utils.getChallengeOffset(
        assertion.response.clientDataJSON,
        challengePrefix
    );

    return {
        id: hexArrayStr(assertion.rawId),
        authenticatorData: utils.hexArrayStr(
            assertion.response.authenticatorData
        ),
        clientData: utils.hexArrayStr(assertion.response.clientDataJSON),
        challengeOffset,
        signature: {
            r: utils.hexArrayStr(rs[0]),
            s: utils.hexArrayStr(rs[1]),
        },
    };
};

const signWithPasskey = async (
    challenge: string,
    webAuthnSigners?: WebAuthnSigner[]
): Promise<WebAuthnSignature> => {
    let publicKeyCredentials: PublicKeyCredentialDescriptor[] | undefined;

    if (webAuthnSigners) {
        publicKeyCredentials = webAuthnSigners.map((webAuthnSigner) => {
            return {
                id: parseHex(webAuthnSigner.publicKeyId),
                type: "public-key",
            };
        });
    }

    const signature = await sign(
        keccak256(hashMessage(challenge)),
        publicKeyCredentials
    );

    return signature;
};

const setPasskeyInStorage = (
    walletAddress: string,
    publicKeyId: string,
    publicKeyX: string,
    publicKeyY: string
): void => {
    const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
        id: publicKeyId,
        pubkeyCoordinates: {
            x: publicKeyX as Hex,
            y: publicKeyY as Hex,
        },
    };

    const localStoragePasskey = JSON.stringify(passkeyWithCoordinates);
    window.localStorage.setItem(
        `cometh-connect-${walletAddress}`,
        localStoragePasskey
    );
};

const getPasskeyInStorage = (walletAddress: string): string | null => {
    return window.localStorage.getItem(`cometh-connect-${walletAddress}`);
};

/* const getSignerFromCredentials = async ({
  publicKeyX,
  publicKeyY,
  walletAddress,
}: {
  publicKeyX: string;
  publicKeyY: string;
  walletAddress?: string;
}): Promise<{
  deviceData: DeviceData;
  signerAddress: string;
  walletAddress: string;
}> => {
  const deviceData = getDeviceData();

  const signerAddress = getSignerAddressFromPubkeyCoords(
    publicKeyX,
    publicKeyY
  );

  walletAddress = walletAddress || (await API.getWalletAddress(signerAddress));

  return {
    deviceData,
    signerAddress,
    walletAddress,
  };
}; */

const getPasskeySigner = async ({
    api,
    walletAddress,
}: {
    api: API;
    walletAddress: string;
}): Promise<PasskeyLocalStorageFormat> => {
    const passkeySigners =
        await api.getPasskeySignersByWalletAddress(walletAddress);

    if (passkeySigners.length === 0) throw new NoPasskeySignerFoundInDBError();

    /* Retrieve potentiel WebAuthn credentials in storage */
    const localStoragePasskey = getPasskeyInStorage(walletAddress);

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

    /* If no local storage or no match in db, Call Webauthn API to get current signer */
    let signature: WebAuthnSignature;
    try {
        signature = await signWithPasskey(
            "SDK Connection",
            passkeySigners as WebAuthnSigner[]
        );
    } catch {
        throw new NoPasskeySignerFoundInDeviceError();
    }

    const signingWebAuthnSigner = await api.getPasskeySignerByPublicKeyId(
        signature.id
    );

    const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
        id: signingWebAuthnSigner.publicKeyId,
        pubkeyCoordinates: {
            x: signingWebAuthnSigner.publicKeyX as Hex,
            y: signingWebAuthnSigner.publicKeyY as Hex,
        },
    };

    /* Store WebAuthn credentials in storage */
    setPasskeyInStorage(
        walletAddress,
        passkeyWithCoordinates.id,
        passkeyWithCoordinates.pubkeyCoordinates.x,
        passkeyWithCoordinates.pubkeyCoordinates.y
    );

    return passkeyWithCoordinates;
};

export {
    createPasskeySigner,
    getPasskeyInStorage,
    getPasskeySigner,
    /*   getSignerFromCredentials, */
    setPasskeyInStorage,
    sign,
    /*   signWithPasskey, */
};
