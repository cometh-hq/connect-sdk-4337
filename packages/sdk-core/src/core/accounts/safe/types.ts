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

export type SafeContractParams = {
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    multisendAddress: Address;
    setUpContractAddress: Address;
    fallbackHandler?: Address;
    safe4337ModuleAddress?: Address;
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
<<<<<<< HEAD
<<<<<<< HEAD

export const SAFE_SENTINEL_OWNERS = "0x1";
=======
>>>>>>> bac4782 (feat/sdk-lite (#75))
=======

export const SAFE_SENTINEL_OWNERS = "0x1";
>>>>>>> 8f70c31 (Sdk core/new features (#77))
