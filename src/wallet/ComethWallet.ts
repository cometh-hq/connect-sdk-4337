import { ethers } from 'ethers'
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
import { DEFAULT_CHAIN_ID, DEFAULT_RPC_TARGET } from '../constants'
import {
  createPasskey,
  PasskeyLocalStorageFormat,
  toLocalStorageFormat
} from '../services/passkeys'
import {
  encodeSafeModuleSetupCall,
  getExecuteUserOpData,
  getInitHash,
  getLaunchpadInitializer,
  getSafeAddress,
  isDeployed,
  SafeInitializer
} from '../services/safeService'
import {
  estimateUserOpGasLimit,
  packGasParameters,
  prepareUserOperation,
  prepareUserOperationWithInitialisation,
  SendUserOp,
  signUserOp,
  signUserOpWithInitialisation,
  UnsignedPackedUserOperation
} from '../services/userOpService'
import { isMetaTransactionArray } from '../utils/utils'
import { EmptyBatchTransactionError, WalletNotConnectedError } from './errors'

export class ComethWallet {
  readonly chainId: number
  private provider: ethers.JsonRpcProvider
  private walletAddress?: string
  private isWalletDeployed?: boolean
  private passkey?: PasskeyLocalStorageFormat
  private launchpadInitializer?: string
  private initializer?: SafeInitializer

  constructor() {
    this.chainId = DEFAULT_CHAIN_ID
    this.provider = new ethers.JsonRpcProvider(DEFAULT_RPC_TARGET)
  }

  /**
   * Connection Section
   */

  public async connect(): Promise<void> {
    const storagePasskey = this.getWebauthnCredentialsInStorage()

    if (storagePasskey) {
      this.passkey = JSON.parse(storagePasskey)
    } else {
      const passkey = await createPasskey()
      this.passkey = toLocalStorageFormat(passkey)
      this.setWebauthnCredentialsInStorage(this.passkey)
    }

    if (!this.passkey) throw new Error('no passkey found')

    this.initializer = {
      singleton: SAFE_SINGLETON_ADDRESS,
      fallbackHandler: SAFE_4337_MODULE_ADDRESS,
      signerFactory: WEBAUTHN_SIGNER_FACTORY_ADDRESS,
      signerData: ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'address'],
        [
          this.passkey.pubkeyCoordinates.x,
          this.passkey.pubkeyCoordinates.y,
          WEBAUTHN_VERIFIER_ADDRESS
        ]
      ),
      setupTo: SAFE_MODULE_SETUP_ADDRESS,
      setupData: encodeSafeModuleSetupCall([SAFE_4337_MODULE_ADDRESS])
    }

    const initHash = getInitHash(this.initializer, DEFAULT_CHAIN_ID)
    this.launchpadInitializer = getLaunchpadInitializer(initHash)

    this.walletAddress = getSafeAddress(
      this.launchpadInitializer,
      SAFE_PROXY_FACTORY_ADDRESS,
      SAFE_SIGNER_LAUNCHPAD_ADDRESS,
      ethers.ZeroHash
    )

    if (!this.walletAddress) throw new WalletNotConnectedError()

    try {
      this.isWalletDeployed = await isDeployed(
        this.walletAddress,
        this.provider
      )
    } catch {
      this.isWalletDeployed = false
    }
  }

  setWebauthnCredentialsInStorage = (
    passkey: PasskeyLocalStorageFormat
  ): void => {
    const localPasskey = JSON.stringify(passkey)
    window.localStorage.setItem(`cometh-connect`, localPasskey)
  }

  getWebauthnCredentialsInStorage = (): string | null => {
    return window.localStorage.getItem(`cometh-connect`)
  }

  public getAddress(): string {
    return this.walletAddress ?? ''
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

    const userOpHash = await this._signAndSendTransaction(unsignedUserOp)

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
