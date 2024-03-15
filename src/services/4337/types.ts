import { ethers } from 'ethers'

export type TStatus = 'success' | 'reverted'

export type GetUserOperationReceiptReturnType = {
  userOpHash: string
  sender: string
  nonce: bigint
  actualGasUsed: bigint
  actualGasCost: bigint
  success: boolean
  receipt: {
    transactionHash: string
    transactionIndex: bigint
    blockHash: string
    blockNumber: bigint
    from: string
    to: string | null
    cumulativeGasUsed: bigint
    status: TStatus
    gasUsed: bigint
    contractAddress: string | null
    logsBloom: string
    effectiveGasPrice: bigint
  }
  logs: {
    data: string
    blockNumber: bigint
    blockHash: string
    transactionHash: string
    logIndex: bigint
    transactionIndex: bigint
    address: string
    topics: string[]
  }[]
}

export type PackedUserOperation = {
  sender: string
  nonce: ethers.BigNumberish
  initCode: ethers.BytesLike
  callData: ethers.BytesLike
  accountGasLimits: ethers.BytesLike
  preVerificationGas: ethers.BigNumberish
  gasFees: ethers.BytesLike
  paymasterAndData: ethers.BytesLike
  signature: ethers.BytesLike
}

export type UnPackedUserOperation = {
  sender: string
  nonce: ethers.BigNumberish
  initCode: ethers.BytesLike
  callData: ethers.BytesLike
  callGasLimit: ethers.BigNumberish
  verificationGasLimit: ethers.BigNumberish
  preVerificationGas: ethers.BigNumberish
  maxFeePerGas: ethers.BigNumberish
  maxPriorityFeePerGas: ethers.BigNumberish
  paymasterAndData: ethers.BytesLike
  signature: ethers.BytesLike
}

export type UnsignedPackedUserOperation = Omit<PackedUserOperation, 'signature'>
export type UnsignedUserOperation = Omit<UnPackedUserOperation, 'signature'>

export type UserOperation = {
  sender: string
  nonce: ethers.BigNumberish
  initCode?: string
  factory?: string
  factoryData?: ethers.BytesLike
  callData: ethers.BytesLike
  callGasLimit?: ethers.BigNumberish
  verificationGasLimit?: ethers.BigNumberish
  preVerificationGas?: ethers.BigNumberish
  maxFeePerGas: ethers.BigNumberish
  maxPriorityFeePerGas: ethers.BigNumberish
  paymasterAndData?: string
  paymaster?: string
  paymasterVerificationGasLimit?: ethers.BigNumberish
  paymasterPostOpGasLimit?: ethers.BigNumberish
  paymasterData?: ethers.BytesLike
  signature: ethers.BytesLike
}

export type UserOpGasLimitEstimation = {
  preVerificationGas: string
  callGasLimit: string
  verificationGasLimit: string
}
