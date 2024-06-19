import type { Address, Hex } from "viem";

// Hardcoded because we cannot easily install @safe-global/safe-contracts because of conflicting ethers.js versions
export const SafeProxyBytecode =
    "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";

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

export const SAFE_SENTINEL_OWNERS = "0x1";

export type MultiSendTransaction = {
    // 0 for CALL, 1 for DELEGATECALL
    op: 0 | 1;
    to: Address;
    value?: any;
    data: `0x${string}`;
};

export type InternalTx = {
    to: Address;
    data: `0x${string}`;
    value: bigint;
    operation: 0 | 1;
};

export type WebAuthnSharedSignerData = {
    x: Hex;
    y: Hex;
    verifiers: Address;
};

export interface SafeSignature {
    signer: string;
    data: string;
    // a flag to indicate if the signature is a contract signature and the data has to be appended to the dynamic part of signature bytes
    dynamic?: true;
}
