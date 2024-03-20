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
