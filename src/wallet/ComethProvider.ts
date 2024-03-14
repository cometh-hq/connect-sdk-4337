import {
  BaseProvider,
  Network,
  TransactionReceipt,
  TransactionResponse
} from '@ethersproject/providers'
import { JsonRpcProvider } from 'ethers'

import { DEFAULT_CHAIN_ID } from '../constants'
/* import { ComethSigner } from './ComethSigner' */
import { SafeAccount } from './accounts/safe/SafeAccount'
import { RelayTransactionResponse } from './RelayTransactionResponse'

export class ComethProvider extends BaseProvider {
  //readonly signer: ComethSigner
  readonly bundler: JsonRpcProvider

  constructor(private wallet: SafeAccount) {
    super({
      name: 'Connect Custom Network',
      chainId: wallet.chainId ?? DEFAULT_CHAIN_ID
    })
    //this.signer = new ComethSigner(wallet, this)
    this.bundler = wallet.getProvider()
  }
  /*
  getSigner(): ComethSigner {
    return this.signer
  }

   async perform(method: string, params: any): Promise<any> {
    if (method === 'sendTransaction') {
      throw new Error('Not authorized method: sendTransaction')
    }
    return await this.wallet.getProvider().perform(method, params)
  } */

  async send(method: string, params: any): Promise<any> {
    return await this.wallet.getProvider().send(method, params)
  }

  async getTransaction(
    userOperationHash: string
  ): Promise<TransactionResponse> {
    return new RelayTransactionResponse(
      userOperationHash,
      this.bundler,
      this.wallet
    )
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>
  ): Promise<TransactionReceipt> {
    return super.getTransactionReceipt(transactionHash)
  }

  async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<TransactionReceipt> {
    return super.waitForTransaction(transactionHash, confirmations, timeout)
  }

  /*   async detectNetwork(): Promise<Network> {
    return this.wallet.getProvider().detectNetwork()
  } */

  eth_accounts(): string[] {
    return [this.wallet.getAddress()]
  }
}
