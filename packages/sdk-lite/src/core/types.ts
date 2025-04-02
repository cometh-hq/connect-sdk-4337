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

export type Signer = {
    signerAddress: Address;
    deviceData: DeviceData;
    publicKeyId?: Hex;
    publicKeyX?: Hex;
    publicKeyY?: Hex;
};
