import { ethers } from 'ethers'

import { GetUserOperationReceiptReturnType } from './types'

const transactionReceiptStatus = {
  '0x0': 'reverted',
  '0x1': 'success'
} as const

/**
 * Retrieves the EIP-4337 bundler provider.
 * @returns The EIP-4337 bundler provider.
 */
function getEip4337BundlerProvider(): ethers.JsonRpcProvider {
  const provider = new ethers.JsonRpcProvider(
    /* 'https://polygon.bundler.develop.core.cometh.tech/rpc' */
    'https://bundler.biconomy.io/api/v2/11155111/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44'
  )
  return provider
}

async function getUserOperationReceipt(
  provider: ethers.JsonRpcProvider,
  hash: string
): Promise<GetUserOperationReceiptReturnType> {
  const response = await provider.send('eth_getUserOperationReceipt', [hash])

  const userOperationReceipt: GetUserOperationReceiptReturnType = {
    userOpHash: response.userOpHash,
    sender: response.sender,
    nonce: BigInt(response.nonce),
    actualGasUsed: BigInt(response.actualGasUsed),
    actualGasCost: BigInt(response.actualGasCost),
    success: response.success,
    receipt: {
      transactionHash: response.receipt.transactionHash,
      transactionIndex: BigInt(response.receipt.transactionIndex),
      blockHash: response.receipt.blockHash,
      blockNumber: BigInt(response.receipt.blockNumber),
      from: response.receipt.from,
      to: response.receipt.to,
      cumulativeGasUsed: BigInt(response.receipt.cumulativeGasUsed),
      status: transactionReceiptStatus[response.receipt.status],
      gasUsed: BigInt(response.receipt.gasUsed),
      contractAddress: response.receipt.contractAddress,
      logsBloom: response.receipt.logsBloom,
      effectiveGasPrice: BigInt(response.receipt.effectiveGasPrice)
    },
    logs: response.logs.map((log) => ({
      data: log.data,
      blockNumber: BigInt(log.blockNumber),
      blockHash: log.blockHash,
      transactionHash: log.transactionHash,
      logIndex: BigInt(log.logIndex),
      transactionIndex: BigInt(log.transactionIndex),
      address: log.address,
      topics: log.topics
    }))
  }

  return userOperationReceipt
}

export { getEip4337BundlerProvider, getUserOperationReceipt }
