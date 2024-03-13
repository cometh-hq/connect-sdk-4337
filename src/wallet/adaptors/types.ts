import { ethers, HDNodeWallet, JsonRpcSigner, Wallet } from 'ethers'

import { PasskeySigner } from '../signers'
import { SupportedNetworks, webAuthnOptions } from '../types'

export interface AuthAdaptor {
  logout(): Promise<void>
  createSigner(): Promise<PasskeySigner | Wallet | HDNodeWallet>
  createWallet(walletAddress: string): Promise<void>
  authenticate(walletAddress: string): Promise<void>
  getAccount(): Promise<string | null>
  getSigner(): JsonRpcSigner | Wallet | PasskeySigner | HDNodeWallet
  getWalletAddress(): string
  provider: ethers.JsonRpcProvider
  readonly chainId: string
  readonly apiKey: string
}

export type PasskeyOptions = {
  passkeyName?: string
  webAuthnOptions?: webAuthnOptions
}

export type FallbackOptions = {
  disable?: boolean
  encryptionSalt?: string
}

export type NetworkOptions = {
  chainId: SupportedNetworks
  rpcUrl?: string
}
