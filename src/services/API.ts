import axios, { AxiosInstance } from 'axios'

import { API_URL } from '../constants'
import {
  DeviceData,
  NewSignerRequest,
  NewSignerRequestType,
  RelayTransactionType,
  SponsoredTransaction,
  WalletInfos,
  WebAuthnSigner
} from '../wallet/types'

export class API {
  private readonly api: AxiosInstance

  constructor(apiKey: string, baseUrl?: string) {
    this.api = axios.create({ baseURL: baseUrl || API_URL })
    this.api.defaults.headers.common['apikey'] = apiKey
  }

  async getWalletAddress(ownerAddress: string): Promise<string> {
    const response = await this.api.get(
      `/wallets/${ownerAddress}/wallet-address`
    )
    return response?.data?.walletAddress
  }

  async getWalletInfos(walletAddress: string): Promise<WalletInfos> {
    const response = await this.api.get(
      `/wallets/${walletAddress}/wallet-infos`
    )
    return response?.data?.walletInfos
  }

  async getSponsoredAddresses(): Promise<SponsoredTransaction[]> {
    const response = await this.api.get(`/sponsored-address`)

    return response?.data?.sponsoredAddresses
  }

  async relayTransaction({
    walletAddress,
    safeTxData,
    signatures
  }: RelayTransactionType): Promise<string> {
    const body = {
      ...safeTxData,
      nonce: safeTxData?.nonce?.toString(),
      baseGas: safeTxData?.baseGas?.toString(),
      gasPrice: safeTxData?.gasPrice?.toString(),
      safeTxGas: safeTxData?.safeTxGas?.toString(),
      signatures
    }
    const response = await this.api.post(
      `/wallets/${walletAddress}/relay`,
      body
    )
    return response.data?.safeTxHash
  }

  async initWallet({
    ownerAddress
  }: {
    ownerAddress: string
  }): Promise<string> {
    const body = {
      ownerAddress
    }

    const response = await this.api.post(`/wallets/init`, body)

    return response?.data.walletAddress
  }

  async initWalletWithPasskey({
    walletAddress,
    publicKeyId,
    publicKeyX,
    publicKeyY,
    deviceData
  }: {
    walletAddress: string
    publicKeyId: string
    publicKeyX: string
    publicKeyY: string
    deviceData: DeviceData
  }): Promise<void> {
    const body = {
      walletAddress,
      publicKeyId,
      publicKeyX,
      publicKeyY,
      deviceData
    }

    await this.api.post(`/wallets/init-with-webauthn`, body)
  }

  async importExternalSafe({
    message,
    signature,
    walletAddress,
    signerAddress,
    deviceData,
    publicKeyId,
    publicKeyX,
    publicKeyY
  }: {
    message: string
    signature: string
    walletAddress: string
    signerAddress: string
    deviceData: DeviceData
    publicKeyId?: string
    publicKeyX?: string
    publicKeyY?: string
  }): Promise<string> {
    const body = {
      message,
      signature,
      walletAddress,
      signerAddress,
      deviceData,
      publicKeyId,
      publicKeyX,
      publicKeyY
    }

    const response = await this.api.post(`/wallets/import`, body)

    return response?.data.signerAddress
  }

  async deployPasskeySigner({
    token,
    walletAddress,
    publicKeyId,
    publicKeyX,
    publicKeyY,
    deviceData
  }: {
    token: string
    walletAddress: string
    publicKeyId: string
    publicKeyX: string
    publicKeyY: string
    deviceData: DeviceData
  }): Promise<string> {
    const config = {
      headers: {
        token
      }
    }

    const body = {
      walletAddress,
      publicKeyId,
      publicKeyX,
      publicKeyY,
      deviceData
    }

    const response = await this.api.post(
      `/user/deploy-webauthn-signer`,
      body,
      config
    )
    return response.data?.signerAddress
  }

  /**
   * WebAuthn Section
   */

  async getPasskeySignerByPublicKeyId(
    publicKeyId: string
  ): Promise<WebAuthnSigner> {
    const response = await this.api.get(
      `/webauthn-signer/public-key-id/${publicKeyId}`
    )
    return response?.data?.webAuthnSigner
  }

  async getPasskeySignersByWalletAddress(
    walletAddress: string
  ): Promise<WebAuthnSigner[]> {
    const response = await this.api.get(`/webauthn-signer/${walletAddress}`)
    return response?.data?.webAuthnSigners
  }

  /**
   * New signer request
   */

  async getNewSignerRequests(
    walletAddress: string
  ): Promise<NewSignerRequest[] | null> {
    const response = await this.api.get(`/new-signer-request/${walletAddress}`)

    return response.data.signerRequests
  }

  async createNewSignerRequest({
    token,
    walletAddress,
    signerAddress,
    deviceData,
    type,
    publicKeyX,
    publicKeyY,
    publicKeyId
  }: {
    token: string
    walletAddress: string
    signerAddress: string
    deviceData: DeviceData
    type: NewSignerRequestType
    publicKeyId?: string
    publicKeyX?: string
    publicKeyY?: string
  }): Promise<void> {
    const config = {
      headers: {
        token
      }
    }

    const body = {
      walletAddress,
      signerAddress,
      deviceData,
      type,
      publicKeyX,
      publicKeyY,
      publicKeyId
    }
    await this.api.post(`/user/new-signer-request`, body, config)
  }

  async deleteNewSignerRequest({
    token,
    signerAddress
  }: {
    token: string
    signerAddress: string
  }): Promise<void> {
    const config = {
      headers: {
        token
      }
    }

    await this.api.delete(`/user/new-signer-request/${signerAddress}`, config)
  }
}
