import type { Hex } from "viem";
import type { DeviceData } from "../../types";

type Assertion = {
    rawId: ArrayBuffer;
    response: AuthenticatorAssertionResponse;
};

type PasskeyCredential = {
    id: "string";
    rawId: ArrayBuffer;
    response: {
        clientDataJSON: ArrayBuffer;
        attestationObject: ArrayBuffer;
        getPublicKey(): ArrayBuffer;
        getPublicKeyAlgorithm(): number;
    };
    type: "public-key";
};

type PasskeyCredentialWithPubkeyCoordinates = PasskeyCredential & {
    pubkeyCoordinates: {
        x: string;
        y: string;
    };
};

type PasskeyCredentials = Readonly<{
    publicKeyId: Hex;
    publicKeyX: Hex;
    publicKeyY: Hex;
}>;

interface webAuthnOptions {
    authenticatorSelection?: {
        authenticatorAttachment?: AuthenticatorAttachment;
        userVerification?: UserVerificationRequirement;
        requireResidentKey?: boolean;
        residentKey?: ResidentKeyRequirement;
    };
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    extensions?: any;
}

type PasskeyLocalStorageFormat = {
    id: string;
    pubkeyCoordinates: {
        x: Hex;
        y: Hex;
    };
    publicKeyAlgorithm?: number;
};

type P256Signature = Readonly<{
    r: string;
    s: string;
}>;

/**
 * The signature of a webauthn authentication
 */
type WebAuthnSignature = Readonly<{
    id: string;
    authenticatorData: string;
    clientData: string;
    challengeOffset: number;
    signature: P256Signature;
}>;

type WebAuthnSigner = {
    projectId: string;
    userId: string;
    chainId: string;
    walletAddress: string;
    publicKeyId: string;
    publicKeyX: string;
    publicKeyY: string;
    signerAddress: string;
    deviceData: DeviceData;
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    deploymentParams: any;
};

export type {
    Assertion,
    PasskeyCredential,
    PasskeyCredentials,
    PasskeyCredentialWithPubkeyCoordinates,
    webAuthnOptions,
    PasskeyLocalStorageFormat,
    P256Signature,
    WebAuthnSignature,
    WebAuthnSigner,
};
