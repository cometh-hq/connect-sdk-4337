import type { Address } from "viem";

export const EIP712_SAFE_OPERATION_TYPE = {
    SafeOp: [
        { type: "address", name: "safe" },
        { type: "uint256", name: "nonce" },
        { type: "bytes", name: "initCode" },
        { type: "bytes", name: "callData" },
        { type: "uint128", name: "verificationGasLimit" },
        { type: "uint128", name: "callGasLimit" },
        { type: "uint256", name: "preVerificationGas" },
        { type: "uint128", name: "maxPriorityFeePerGas" },
        { type: "uint128", name: "maxFeePerGas" },
        { type: "bytes", name: "paymasterAndData" },
        { type: "uint48", name: "validAfter" },
        { type: "uint48", name: "validUntil" },
        { type: "address", name: "entryPoint" },
    ],
};

export const EIP712_SAFE_MESSAGE_TYPE = {
    // "SafeMessage(bytes message)"
    SafeMessage: [{ type: "bytes", name: "message" }],
};

export enum WalletVersion {
    V1 = "v1.0",
}

export type SafeContractParams = {
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    multisendAddress: Address;
    fallbackHandler: Address;
    setUpContractAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    p256Verifier: Address;
    safeWebAuthnSignerFactory: Address;
    safe4337ModuleAddress?: Address;
    safe4337SessionKeysModule?: Address;
    migrationContractAddress?: Address;
};

export type RecoveryParams = {
    socialRecoveryModuleAddress: Address;
    moduleFactoryAddress: Address;
    delayModuleAddress: Address;
    recoveryCooldown: number;
    recoveryExpiration: number;
    guardianAddress: Address;
};

export type DeploymentParams = {
    version: WalletVersion;
    safeContractParams: SafeContractParams;
    recoveryParams: RecoveryParams;
};

export type ProjectParams = {
    chainId: string;
    safeContractParams: SafeContractParams;
    recoveryParams: RecoveryParams;
};

export type MultiSendTransaction = {
    // 0 for CALL, 1 for DELEGATECALL
    op: number;
    to: Address;
    value?: bigint;
    data: `0x${string}`;
};

export interface SafeSignature {
    signer: string;
    data: string;
    // a flag to indicate if the signature is a contract signature and the data has to be appended to the dynamic part of signature bytes
    dynamic?: true;
}

export type Wallet = {
    projectId: string;
    chainId: string;
    address: string;
    creationDate: Date;
    connectionDate: Date;
    initiatorAddress: string;
    deploymentParams: DeploymentParams;
};
