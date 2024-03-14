import { ethers, HDNodeWallet, isAddress, Wallet } from 'ethers'

import { DEFAULT_RPC_TARGET, DEFAULT_WEBAUTHN_OPTIONS } from '../../constants'
import { API } from '../../services/API'
import deviceService from '../../services/deviceService'
import eoaFallbackService from '../../services/fallback/eoaFallbackService'
import {
  createPasskey,
  getPasskeyInStorage,
  getSigner,
  getSignerFromCredentials,
  retrieveWalletAddressFromSigner,
  setPasskeyInStorage,
  waitPasskeySignerDeployment
} from '../../services/passkeys/passkeyService'
import { isWebAuthnCompatible } from '../../services/passkeys/utils'
import { PasskeySigner } from '../signers/PasskeySigner'
import {
  NewSignerRequest,
  NewSignerRequestBody,
  NewSignerRequestType,
  SupportedNetworks,
  WalletInfos,
  webAuthnOptions,
  webauthnStorageValues
} from '../types'
import {
  AuthAdaptor,
  FallbackOptions,
  NetworkOptions,
  PasskeyOptions
} from './types'

export interface PasskeyAdaptorConfig {
  apiKey: string
  networkOptions: NetworkOptions
  passkeyOptions?: PasskeyOptions
  fallbackOptions?: FallbackOptions
  baseUrl?: string
}

export class PasskeyAdaptor implements AuthAdaptor {
  private disableEoaFallback: boolean
  private webAuthnOptions: webAuthnOptions
  private encryptionSalt?: string
  private signer?: PasskeySigner | Wallet | HDNodeWallet
  readonly chainId: SupportedNetworks
  private API: API
  public apiKey: string
  public provider: ethers.JsonRpcProvider
  private walletAddress?: string
  private passkeyName?: string

  constructor({
    apiKey,
    networkOptions,
    passkeyOptions,
    fallbackOptions,
    baseUrl
  }: PasskeyAdaptorConfig) {
    this.apiKey = apiKey
    this.disableEoaFallback = fallbackOptions?.disable || false
    this.encryptionSalt = fallbackOptions?.encryptionSalt
    this.API = new API(apiKey, baseUrl)
    this.chainId = networkOptions.chainId
    this.provider = new ethers.JsonRpcProvider(DEFAULT_RPC_TARGET)
    this.passkeyName = passkeyOptions?.passkeyName
    this.webAuthnOptions =
      passkeyOptions?.webAuthnOptions || DEFAULT_WEBAUTHN_OPTIONS
  }

  async createSigner(): Promise<PasskeySigner | Wallet | HDNodeWallet> {
    const isPasskeyCompatible = await isWebAuthnCompatible(this.webAuthnOptions)

    if (isPasskeyCompatible) {
      await this._createSignerWithPasskey()
    } else {
      await this._createSignerWithFallback()
    }

    if (!this.signer) throw new Error('signer not created')
    return this.signer
  }

  private async _createSignerWithPasskey(): Promise<void> {
    const { publicKeyId, publicKeyX, publicKeyY, publicKeyAlgorithm } =
      await createPasskey(this.webAuthnOptions, this.passkeyName)

    if (publicKeyAlgorithm === -7) {
      const { signerAddress } = await getSignerFromCredentials({
        API: this.API,
        publicKeyX,
        publicKeyY
      })

      this.signer = new PasskeySigner(
        publicKeyId,
        publicKeyX,
        publicKeyY,
        signerAddress
      )
    } else {
      await this._createSignerWithFallback()
    }
  }

  private async _createSignerWithFallback(): Promise<void> {
    this._throwErrorWhenEoaFallbackDisabled()

    const { signer } = await eoaFallbackService.createSigner({
      API: this.API,
      encryptionSalt: this.encryptionSalt
    })

    this.signer = signer
  }

  async getSignerFromWallet(
    walletAddress: string
  ): Promise<PasskeySigner | Wallet> {
    const isPasskeyCompatible = await isWebAuthnCompatible(this.webAuthnOptions)

    if (isPasskeyCompatible && !this._isFallbackSigner()) {
      const { publicKeyId, publicKeyX, publicKeyY, signerAddress } =
        await getSigner({
          API: this.API,
          walletAddress,
          provider: this.provider
        })
      this.signer = new PasskeySigner(
        publicKeyId,
        publicKeyX,
        publicKeyY,
        signerAddress
      )
    } else {
      this._throwErrorWhenEoaFallbackDisabled()
      this.signer = await eoaFallbackService.getSigner({
        API: this.API,
        provider: this.provider,
        walletAddress,
        encryptionSalt: this.encryptionSalt
      })
    }

    this.walletAddress = walletAddress
    return this.signer
  }

  _throwErrorWhenEoaFallbackDisabled(): void {
    if (this.disableEoaFallback)
      throw new Error('Passkeys are not compatible with your device')
  }

  async retrieveWalletAddressFromSigner(): Promise<string> {
    return await retrieveWalletAddressFromSigner(this.API)
  }

  async getCurrentSigner(): Promise<
    webauthnStorageValues | string | undefined
  > {
    if (!this.walletAddress) throw new Error('Wallet is not connected')

    if (this._isFallbackSigner()) {
      const localSigner = await eoaFallbackService.getSignerLocalStorage(
        this.walletAddress,
        this.encryptionSalt
      )

      if (localSigner) return localSigner.address
    } else {
      const webauthnWallet = getPasskeyInStorage(this.walletAddress)

      if (webauthnWallet) return JSON.parse(webauthnWallet)
    }

    return undefined
  }

  private _isFallbackSigner(): boolean {
    const fallbackSigner = Object.keys(localStorage).find((key) =>
      key.startsWith('cometh-connect-fallback-')
    )
    return !!fallbackSigner
  }

  async getWalletInfos(walletAddress: string): Promise<WalletInfos> {
    if (!isAddress(walletAddress)) throw new Error('Invalid address format')

    return await this.API.getWalletInfos(walletAddress)
  }

  async logout(): Promise<void> {
    if (!this.signer) throw new Error('No signer instance found')
    this.signer = undefined
  }

  async getAccount(): Promise<string> {
    if (!this.signer) throw new Error('No signer instance found')
    return this.signer.getAddress()
  }

  getSigner(): Wallet | PasskeySigner | HDNodeWallet | ethers.JsonRpcSigner {
    if (!this.signer) throw new Error('No signer instance found')
    return this.signer
  }

  getWalletAddress(): string {
    if (!this.walletAddress) throw new Error('No wallet instance found')
    return this.walletAddress
  }

  async initNewSignerRequest(
    walletAddress: string,
    passkeyName?: string
  ): Promise<NewSignerRequestBody> {
    const wallet = await this.getWalletInfos(walletAddress)

    if (!wallet)
      throw new Error(
        'Wallet does not exist in db. Please verify walletAddress'
      )

    const { addNewSignerRequest, localPrivateKey } =
      await this.createSignerObject(walletAddress, passkeyName)

    if (addNewSignerRequest.type === NewSignerRequestType.WEBAUTHN) {
      setPasskeyInStorage(
        walletAddress,
        addNewSignerRequest.publicKeyId!,
        addNewSignerRequest.signerAddress!
      )
    } else {
      if (!localPrivateKey) throw new Error('no fallback signer found')

      eoaFallbackService.setSignerLocalStorage(
        walletAddress,
        new Wallet(localPrivateKey),
        this.encryptionSalt
      )
    }

    return addNewSignerRequest
  }

  private async createSignerObject(
    walletAddress: string,
    passkeyName?: string
  ): Promise<{
    addNewSignerRequest: NewSignerRequestBody
    localPrivateKey?: string
  }> {
    const isPasskeyCompatible = await isWebAuthnCompatible(this.webAuthnOptions)

    if (isPasskeyCompatible && !this._isFallbackSigner()) {
      const { publicKeyId, publicKeyX, publicKeyY, publicKeyAlgorithm } =
        await createPasskey(this.webAuthnOptions, passkeyName)

      if (publicKeyAlgorithm === -7) {
        const { signerAddress, deviceData } = await getSignerFromCredentials({
          API: this.API,
          publicKeyX,
          publicKeyY
        })

        return {
          addNewSignerRequest: {
            walletAddress,
            signerAddress,
            deviceData,
            type: NewSignerRequestType.WEBAUTHN,
            publicKeyId,
            publicKeyX,
            publicKeyY
          }
        }
      }
    }

    this.signer = Wallet.createRandom()

    return {
      addNewSignerRequest: {
        walletAddress,
        signerAddress: this.signer.address,
        deviceData: deviceService.getDeviceData(),
        type: NewSignerRequestType.BURNER_WALLET
      },
      localPrivateKey: this.signer.privateKey
    }
  }

  async getNewSignerRequests(): Promise<NewSignerRequest[] | null> {
    const walletAddress = this.getWalletAddress()
    return await this.API.getNewSignerRequests(walletAddress)
  }

  async waitPasskeySignerDeployment(publicKeyId: string): Promise<void> {
    const PasskeySigner = await this.API.getPasskeySignerByPublicKeyId(
      publicKeyId
    )

    await waitPasskeySignerDeployment(
      PasskeySigner.deploymentParams.P256FactoryContract,
      PasskeySigner.publicKeyX,
      PasskeySigner.publicKeyY,
      this.provider
    )
  }

  async initRecoveryRequest(
    walletAddress: string,
    passkeyName?: string
  ): Promise<NewSignerRequestBody> {
    return this.initNewSignerRequest(walletAddress, passkeyName)
  }
}
