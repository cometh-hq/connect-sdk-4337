import type { Address, Hex } from "viem";
import type { DeviceData } from "../../types";

type Assertion = {
    rawId: ArrayBuffer;
    response: AuthenticatorAssertionResponse;
};

type OxPasskeyCredential = {
    id: string;
    publicKey: {
        prefix: number;
        x: Hex;
        y: Hex;
    };
    raw: {
        rawId: ArrayBuffer;
        response: {
            clientDataJSON: ArrayBuffer;
            attestationObject: ArrayBuffer;
            getPublicKey(): ArrayBuffer;
            getPublicKeyAlgorithm(): number;
        };
        type: "public-key";
    };
};

type PasskeyCredentials = Readonly<{
    publicKeyId: Hex;
    publicKeyX: Hex;
    publicKeyY: Hex;
}>;

type PRFExtensionInput = {
    eval?: { first: Uint8Array; second?: Uint8Array };
    evalByCredential?: Record<
        string,
        { first: Uint8Array; second?: Uint8Array }
    >;
};

type PRFExtensionOutput = {
    enabled?: boolean;
    results?: { first: ArrayBuffer; second?: ArrayBuffer };
};

type WebAuthnExtensions = {
    prf?: PRFExtensionInput;
} & Record<string, unknown>;

interface webAuthnOptions {
    authenticatorSelection?: {
        authenticatorAttachment?: AuthenticatorAttachment;
        userVerification?: UserVerificationRequirement;
        requireResidentKey?: boolean;
        residentKey?: ResidentKeyRequirement;
    };
    attestation?: AttestationConveyancePreference;
    extensions?: WebAuthnExtensions;
    tauriOptions?: {
        androidApkOrigin: string;
        rpId: string;
    };
}

type PasskeyLocalStorageFormat = {
    id: Hex;
    pubkeyCoordinates: {
        x: Hex;
        y: Hex;
    };
    signerAddress: Address;
    publicKeyAlgorithm?: number;
};

type P256Signature = Readonly<{
    r: Hex;
    s: Hex;
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

enum WebauthnVersion {
    V1 = "v1.0",
}

type WebAuthnDeploymentParams = {
    version: WebauthnVersion;
    safeWebAuthnSharedSignerAddress: string;
    safeWebAuthnSignerFactory: string;
    safeWebAuthnSignerSingleton: string;
    verifier: string;
};

type WebAuthnSigner = {
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

export type {
    Assertion,
    PasskeyCredentials,
    OxPasskeyCredential,
    webAuthnOptions,
    PasskeyLocalStorageFormat,
    P256Signature,
    WebAuthnSignature,
    WebAuthnSigner,
    PRFExtensionInput,
    PRFExtensionOutput,
    WebAuthnExtensions,
};
