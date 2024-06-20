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

export type DeviceData = {
    browser: string;
    os: string;
    platform: string;
};

export type WebAuthnSigner = {
    projectId: string;
    userId: string;
    chainId: string;
    walletAddress: string;
    publicKeyId: string;
    publicKeyX: string;
    publicKeyY: string;
    signerAddress: string;
    deviceData: DeviceData;
    creationDate?: Date;
};

export type WalletInfos = {
    chainId: string;
    address: Address;
    creationDate: Date;
    initiatorAddress: Address;
};

export enum NewSignerRequestType {
    WEBAUTHN = "WEBAUTHN",
    FALLBACK_WALLET = "FALLBACK_WALLET",
}

export type Signer = {
    smartAccountAddress: Address;
    signerAddress: Address;
    deviceData: DeviceData;
    publicKeyId?: Hex;
    publicKeyX?: Hex;
    publicKeyY?: Hex;
};

export type NewSignerRequestBody = Signer & {
    type: NewSignerRequestType;
};

export type NewSignerRequest = NewSignerRequestBody & {
    projectId: string;
    userId: string;
    chainId: string;
};
