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
    walletAddress: Address;
    publicKeyId: Hex;
    publicKeyX: Hex;
    publicKeyY: Hex;
    signerAddress: Address;
    deviceData: DeviceData;
};

export type WalletInfos = {
    chainId: string;
    address: Address;
    creationDate: Date;
    initiatorAddress: Address;
    recoveryContext?: {
        moduleFactoryAddress: Address;
        delayModuleAddress: Address;
        recoveryCooldown: number;
        recoveryExpiration: number;
    };
    proxyDelayAddress: Address;
};
