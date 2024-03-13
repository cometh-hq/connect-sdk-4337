import {
  TransactionReceipt,
  TransactionResponse
} from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { AccessList, ethers } from 'ethers'

import { DEFAULT_CONFIRMATION_TIME } from '../constants'
import { getUserOperationReceipt } from '../services/4337/bundlerService'
import { GetUserOperationReceiptReturnType } from '../services/4337/types'
import { deepHexlify } from '../utils'
import { SafeAccount } from './SafeAccount'

export class RelayTransactionResponse implements TransactionResponse {
  hash: string
  timeout: number
  blockNumber?: number
  blockHash?: string
  timestamp?: number
  confirmations: number
  from: string
  raw?: string
  to?: string
  nonce: number
  gasLimit: BigNumber
  gasPrice?: BigNumber
  data: string
  value: BigNumber
  chainId: number
  r?: string
  s?: string
  v?: number
  type?: number | null
  accessList?: AccessList
  maxPriorityFeePerGas?: BigNumber
  maxFeePerGas?: BigNumber

  constructor(
    private userOpHash: string,
    private provider: ethers.JsonRpcProvider,
    private wallet: SafeAccount
  ) {
    this.hash = '0x0000000000000000000000000000000000000000'
    this.timeout = wallet.transactionTimeout || DEFAULT_CONFIRMATION_TIME
    this.confirmations = 0
    this.from = this.wallet.getAddress()
    this.nonce = 0
    this.gasLimit = BigNumber.from(0)
    this.value = BigNumber.from(0)
    this.data = '0x0'
    this.chainId = 0
  }

  public async wait(): Promise<TransactionReceipt> {
    const startDate = Date.now()

    let userOperationReceipt: GetUserOperationReceiptReturnType | null = null
    while (
      userOperationReceipt === null &&
      new Date(Date.now()) < new Date(startDate + this.timeout)
    ) {
      userOperationReceipt = await getUserOperationReceipt(
        this.provider,
        this.userOpHash
      )

      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    if (userOperationReceipt) {
      this.hash = userOperationReceipt.receipt.transactionHash
      this.from = userOperationReceipt.receipt.from

      return deepHexlify(userOperationReceipt.receipt)
    }

    throw new Error('Error in the relayed transaction')
  }
}
