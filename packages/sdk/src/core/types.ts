import type { Address } from "viem";
import type { Hex } from "viem";

export type UserOperation = {
    sender: Address;
    nonce: bigint;
    initCode: Hex;
    callData: Hex;
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterAndData: Hex;
    signature: Hex;
    factory?: never;
    factoryData?: never;
    paymaster?: never;
    paymasterVerificationGasLimit?: never;
    paymasterPostOpGasLimit?: never;
    paymasterData?: never;
};

export type MultiSendTransaction = {
    to: string;
    value?: Hex;
    data: Hex;
    operation: number;
};

export type DeviceData = {
    browser: string;
    os: string;
    platform: string;
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
    creationDate?: Date;
};

export enum WebauthnVersion {
    V1 = "v1.0",
}

export type WebAuthnDeploymentParams = {
    version: WebauthnVersion;
    safeWebAuthnSharedSignerAddress: string;
    safeWebAuthnSignerFactory: string;
    safeWebAuthnSignerSingleton: string;
    verifier: string;
};

export enum SignerType {
    WEBAUTHN = "WEBAUTHN",
    FALLBACK_WALLET = "FALLBACK_WALLET",
}

export type Signer = {
    signerAddress: Address;
    deviceData: DeviceData;
    publicKeyId?: Hex;
    publicKeyX?: Hex;
    publicKeyY?: Hex;
};

export type RecoveryRequest = {
    projectId: string;
    chainId: string;
    walletAddress: string;
    signerAddress: string;
    deviceData: DeviceData;
    type: SignerType;
    publicKeyId?: string;
    publicKeyX?: string;
    publicKeyY?: string;
    deploymentParams?: WebAuthnDeploymentParams;
    creationDate?: Date;
};
