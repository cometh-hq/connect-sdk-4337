import { ethers, HDNodeWallet, Wallet } from 'ethers'
import { encodeMulti, MetaTransaction } from 'ethers-multisend'

import {
  ENTRYPOINT_ADDRESS,
  MULTISEND_ADDRESS,
  SAFE_4337_MODULE_ADDRESS,
  SAFE_MODULE_SETUP_ADDRESS,
  SAFE_PROXY_FACTORY_ADDRESS,
  SAFE_SIGNER_LAUNCHPAD_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
  WEBAUTHN_SIGNER_FACTORY_ADDRESS,
  WEBAUTHN_VERIFIER_ADDRESS
} from '../config'
import { DEFAULT_CHAIN_ID } from '../constants'
import { UnsignedPackedUserOperation } from '../services/4337/types'
import {
  estimateUserOpGasLimit,
  packGasParameters,
  prepareUserOperation,
  prepareUserOperationWithInitialisation,
  SendUserOp,
  signUserOp,
  signUserOpWithInitialisation
} from '../services/4337/userOpService'
import { API } from '../services/API'
import { PasskeyLocalStorageFormat } from '../services/passkeys/passkeys'
import {
  encodeSafeModuleSetupCall,
  getExecuteUserOpData,
  getInitHash,
  getLaunchpadInitializer,
  getSafeAddress,
  getSafeAddressWithLaunchpad,
  isDeployed,
  SafeInitializer
} from '../services/safe/safeService'
import { isMetaTransactionArray } from '../utils/utils'
import { AuthAdaptor } from './adaptors'
import { EmptyBatchTransactionError, NoSignerFoundError } from './errors'
import { PasskeySigner } from './signers'
import { SponsoredTransaction, WalletInfos } from './types'

export interface AccountConfig {
  authAdaptor: AuthAdaptor
  transactionTimeout?: number
  baseUrl?: string
}

export class SafeAccount {
  public authAdaptor: AuthAdaptor
  readonly chainId: number
  private provider: ethers.JsonRpcProvider
  private walletAddress?: string
  private isWalletDeployed?: boolean
  private passkey?: PasskeyLocalStorageFormat
  private launchpadInitializer?: string
  private initializer?: SafeInitializer
  public transactionTimeout?: number
  public signer?: HDNodeWallet | Wallet | PasskeySigner | ethers.JsonRpcSigner
  private API: API
  private sponsoredAddresses?: SponsoredTransaction[]

  constructor({ authAdaptor, transactionTimeout, baseUrl }: AccountConfig) {
    this.authAdaptor = authAdaptor
    this.API = new API(authAdaptor.apiKey, baseUrl)
    this.provider = authAdaptor.provider
    this.chainId = +authAdaptor.chainId
    this.transactionTimeout = transactionTimeout
  }

  /**
   * Connection Section
   */

  public async connect(walletAddress?: string): Promise<void> {
    if (!this.authAdaptor) throw new Error('No Auth adaptor found')

    if (!walletAddress) {
      await this.authAdaptor.createSigner()
      this.signer = this.authAdaptor.getSigner()
      this.walletAddress = await this.predictWalletAddress()

      this.authAdaptor.createWallet(this.walletAddress)
    } else {
      await this.authAdaptor.authenticate(walletAddress)
      this.signer = this.authAdaptor.getSigner()
      this.walletAddress = walletAddress
    }

    console.log('address', this.walletAddress)

    if (!this.signer) throw new NoSignerFoundError()

    this.isWalletDeployed = await isDeployed(this.walletAddress, this.provider)

    if (
      this.isWalletDeployed == false &&
      this.signer instanceof PasskeySigner
    ) {
      this.getLaunchpadInitializationParams(this.signer)
    }

    this.sponsoredAddresses = await this.API.getSponsoredAddresses()
  }

  private async predictWalletAddress(): Promise<string> {
    if (!this.signer) throw new NoSignerFoundError()

    if (this.signer instanceof PasskeySigner) {
      this.getLaunchpadInitializationParams(this.signer)

      return getSafeAddressWithLaunchpad(
        this.launchpadInitializer!,
        SAFE_PROXY_FACTORY_ADDRESS,
        SAFE_SIGNER_LAUNCHPAD_ADDRESS,
        ethers.ZeroHash
      )
    } else {
      return await getSafeAddress(this.signer.address, this.provider)
    }
  }

  private getLaunchpadInitializationParams(signer: PasskeySigner): void {
    const { publicKeyX, publicKeyY } = signer.getPasskeyCredentials()

    console.log(publicKeyX, publicKeyY)
    console.log({ DEFAULT_CHAIN_ID })

    this.initializer = {
      singleton: SAFE_SINGLETON_ADDRESS,
      fallbackHandler: SAFE_4337_MODULE_ADDRESS,
      signerFactory: WEBAUTHN_SIGNER_FACTORY_ADDRESS,
      signerData: ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'address'],
        [publicKeyX, publicKeyY, WEBAUTHN_VERIFIER_ADDRESS]
      ),
      setupTo: SAFE_MODULE_SETUP_ADDRESS,
      setupData: encodeSafeModuleSetupCall([SAFE_4337_MODULE_ADDRESS])
    }

    const initHash = getInitHash(this.initializer, DEFAULT_CHAIN_ID)
    this.launchpadInitializer = getLaunchpadInitializer(initHash)
  }

  public getAddress(): string {
    return this.walletAddress ?? ''
  }

  public getProvider(): ethers.JsonRpcProvider {
    return this.provider
  }

  public async _signAndSendTransaction(
    userOp: UnsignedPackedUserOperation
  ): Promise<string | undefined> {
    let rpcUserOp

    if (this.isWalletDeployed) {
      rpcUserOp = await signUserOp(
        userOp,
        this.passkey!,
        ENTRYPOINT_ADDRESS,
        this.chainId
      )
    } else {
      rpcUserOp = await signUserOpWithInitialisation(
        userOp,
        this.passkey!,
        ENTRYPOINT_ADDRESS,
        this.chainId
      )
    }
    return await SendUserOp(rpcUserOp, ENTRYPOINT_ADDRESS)
  }

  public async sendTransaction(
    safeTxData: MetaTransaction
  ): Promise<string | undefined> {
    const unsignedUserOp = await this.buildUserOp(safeTxData)

    console.log({ unsignedUserOp })

    const userOpHash = await this._signAndSendTransaction(unsignedUserOp)

    console.log({ userOpHash })

    if (unsignedUserOp.nonce == 0) this.isWalletDeployed = true

    return userOpHash
  }

  public async sendBatchTransactions(
    safeTxData: MetaTransaction[]
  ): Promise<string | undefined> {
    if (safeTxData.length === 0) {
      throw new EmptyBatchTransactionError()
    }
    const unsignedUserOp = await this.buildUserOp(safeTxData)

    const userOpHash = await this._signAndSendTransaction(unsignedUserOp)

    if (unsignedUserOp.nonce == 0) this.isWalletDeployed = true

    return userOpHash
  }

  public async buildUserOp(
    safeTxData: MetaTransaction | MetaTransaction[]
  ): Promise<UnsignedPackedUserOperation> {
    let txData

    if (isMetaTransactionArray(safeTxData)) {
      const multisendData = encodeMulti(safeTxData, MULTISEND_ADDRESS).data

      txData = {
        to: MULTISEND_ADDRESS,
        value: '0',
        data: multisendData,
        operation: 1
      }
    } else {
      txData = {
        to: safeTxData.to,
        value: safeTxData.value,
        data: safeTxData.data,
        operation: 0
      }
    }

    const calldata = getExecuteUserOpData(
      txData.to,
      txData.value,
      txData.data,
      txData.operation
    )

    const unsignedUserOperation = this.isWalletDeployed
      ? await prepareUserOperation(this.walletAddress!, calldata, this.provider)
      : prepareUserOperationWithInitialisation(
          SAFE_PROXY_FACTORY_ADDRESS,
          calldata,
          this.initializer!,
          this.walletAddress!,
          this.launchpadInitializer!
        )

    const userOpGasLimitEstimation = await estimateUserOpGasLimit(
      unsignedUserOperation
    )

    // Increase the gas limit by 50%, otherwise the user op will fail during simulation with "verification more than gas limit" error
    userOpGasLimitEstimation.verificationGasLimit = `0x${(
      (BigInt(userOpGasLimitEstimation.verificationGasLimit) * 15n) /
      10n
    ).toString(16)}`

    const feeData = await this.provider
      .getFeeData()
      .then((feeData) => {
        return feeData
      })
      .catch((error) => {
        console.error(error)
      })

    if (!feeData?.maxFeePerGas || !feeData?.maxPriorityFeePerGas)
      throw new Error('No fee data found')

    return {
      ...unsignedUserOperation,
      ...packGasParameters({
        verificationGasLimit: userOpGasLimitEstimation.verificationGasLimit,
        callGasLimit: userOpGasLimitEstimation.callGasLimit,
        maxFeePerGas: `0x${(
          (BigInt(feeData?.maxFeePerGas) * 15n) /
          10n
        ).toString(16)}`,
        maxPriorityFeePerGas: `0x${(
          (BigInt(feeData?.maxPriorityFeePerGas) * 15n) /
          10n
        ).toString(16)}`
      }),
      preVerificationGas: `0x${(
        (BigInt(userOpGasLimitEstimation.preVerificationGas) * 15n) /
        10n
      ).toString(16)}`
    } as UnsignedPackedUserOperation
  }
}
