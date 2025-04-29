import type { Address, Chain, Hex, PublicClient } from "viem";
import type { SafeContractParams } from "../../accounts/safeService/types";
import type { DeviceData } from "../../types";

export type Assertion = {
    rawId: ArrayBuffer;
    response: AuthenticatorAssertionResponse;
};

export type PasskeyCredential = {
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

export type PasskeyCredentialWithPubkeyCoordinates = PasskeyCredential & {
    pubkeyCoordinates: {
        x: Hex;
        y: Hex;
    };
};

export type PasskeyCredentials = Readonly<{
    publicKeyId: Hex;
    publicKeyX: Hex;
    publicKeyY: Hex;
}>;

export interface webAuthnOptions {
    authenticatorSelection?: {
        authenticatorAttachment?: AuthenticatorAttachment;
        userVerification?: UserVerificationRequirement;
        requireResidentKey?: boolean;
        residentKey?: ResidentKeyRequirement;
    };
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    extensions?: any;
}

export type PasskeyLocalStorageFormat = {
    id: Hex;
    pubkeyCoordinates: {
        x: Hex;
        y: Hex;
    };
    signerAddress: Address;
    publicKeyAlgorithm?: number;
};

export type P256Signature = Readonly<{
    r: Hex;
    s: Hex;
}>;

/**
 * The signature of a webauthn authentication
 */
export type WebAuthnSignature = Readonly<{
    id: string;
    authenticatorData: string;
    clientData: string;
    challengeOffset: number;
    signature: P256Signature;
}>;

enum WebauthnVersion {
    V1 = "v1.0",
}

export type WebAuthnDeploymentParams = {
    version: WebauthnVersion;
    safeWebAuthnSharedSignerAddress: string;
    safeWebAuthnSignerFactory: string;
    safeWebAuthnSignerSingleton: string;
    verifier: string;
};

export type WebAuthnSigner = {
    projectId: string;
    userId: string;
    chainId: string;
    smartAccountAddress: string;
    publicKeyId: string;
    publicKeyX: string;
    publicKeyY: string;
    signerAddress: string;
    deviceData: DeviceData;
    deploymentParams: WebAuthnDeploymentParams;
};

export interface PasskeySigner {
    type: "passkey";
    passkey: PasskeyLocalStorageFormat;
}

export type PasskeySignerConfig = {
    webAuthnOptions?: webAuthnOptions;
    passKeyName?: string;
    fullDomainSelected?: boolean;
};

export type CreateSignerParams = {
    apiKey: string;
    chain: Chain;
    smartAccountAddress?: Address;
    safeContractParams?: SafeContractParams;
    baseUrl?: string;
    publicClient?: PublicClient;
} & PasskeySignerConfig;
