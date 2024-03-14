import { ethers, HDNodeWallet, Wallet } from 'ethers'
import { encodeMulti, MetaTransaction } from 'ethers-multisend'

import {
  ENTRYPOINT_ADDRESS_V7,
  SAFE_4337_MODULE_ADDRESS,
  SAFE_MODULE_SETUP_ADDRESS,
  SAFE_MULTISEND_ADDRESS,
  SAFE_PROXY_FACTORY_ADDRESS,
  SAFE_SIGNER_LAUNCHPAD_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
  SAFE_WEBAUTHN_SIGNER_FACTORY_ADDRESS,
  SAFE_WEBAUTHN_VERIFIER_ADDRESS
} from '../../../config'
import {
  DEFAULT_CHAIN_ID,
  EIP712_SAFE_INIT_OPERATION_TYPE,
  EIP712_SAFE_OPERATION_TYPE
} from '../../../constants'
import { UnsignedPackedUserOperation } from '../../../services/4337/types'
import {
  buildPackedUserOperationFromSafeUserOperation,
  estimateUserOpGasLimit,
  getUserOpHash,
  packGasParameters,
  prepareUserOperation,
  SendUserOp,
  unpackUserOperationForRpc
} from '../../../services/4337/userOpService'
import { API } from '../../../services/API'
import deviceService from '../../../services/deviceService'
import { setPasskeyInStorage } from '../../../services/passkeys/passkeyService'
import { buildSignatureBytes } from '../../../services/passkeys/utils'
import { prepareUserOperationWithInitialisation } from '../../../services/safe/4337'
import {
  encodeSafeModuleSetupCall,
  getExecuteUserOpData,
  getInitHash,
  getLaunchpadInitializer,
  getSafeAddress,
  getSafeAddressWithLaunchpad,
  isDeployed
} from '../../../services/safe/safeService'
import { SafeInitializer } from '../../../services/safe/types'
import { isMetaTransactionArray } from '../../../utils/utils'
import { AuthAdaptor } from '../../adaptors'
import { EmptyBatchTransactionError, NoSignerFoundError } from '../../errors'
import { PasskeySigner } from '../../signers'
import { BaseAccount, SponsoredTransaction } from '../../types'

export interface AccountConfig {
  authAdaptor: AuthAdaptor
  transactionTimeout?: number
  baseUrl?: string
}

export class SafeAccount implements BaseAccount {
  public authAdaptor: AuthAdaptor
  readonly chainId: number
  private provider: ethers.JsonRpcProvider
  private walletAddress?: string
  private isWalletDeployed?: boolean
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
      this.signer = await this.authAdaptor.createSigner()
      this.walletAddress = await this.predictWalletAddress()

      await this.createWallet(this.walletAddress)
    } else {
      const wallet = await this.API.getWalletInfos(walletAddress)
      if (!wallet) throw new Error('Wallet does not exists')

      this.signer = await this.authAdaptor.getSignerFromWallet(walletAddress)
      this.walletAddress = walletAddress
    }

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

  async createWallet(walletAddress: string): Promise<void> {
    if (this.signer instanceof PasskeySigner) {
      const { publicKeyId, publicKeyX, publicKeyY } =
        this.signer.getPasskeyCredentials()
      const signerAddress = await this.signer.getAddress()
      const deviceData = deviceService.getDeviceData()

      await this.API.initWalletWithPasskey({
        walletAddress,
        publicKeyId,
        publicKeyX,
        publicKeyY,
        deviceData
      })
      setPasskeyInStorage(walletAddress, publicKeyId, signerAddress)
    } else {
      const ownerAddress = this.signer?.address
      if (!ownerAddress) throw new Error('no owner address')
      await this.API.initWallet({
        ownerAddress
      })
    }
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

    this.initializer = {
      singleton: SAFE_SINGLETON_ADDRESS,
      fallbackHandler: SAFE_4337_MODULE_ADDRESS,
      signerFactory: SAFE_WEBAUTHN_SIGNER_FACTORY_ADDRESS,
      signerData: ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'address'],
        [publicKeyX, publicKeyY, SAFE_WEBAUTHN_VERIFIER_ADDRESS]
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

    if (this.signer instanceof PasskeySigner) {
      if (this.isWalletDeployed) {
        const finalUserOp = {
          safe: userOp.sender,
          nonce: userOp.nonce,
          initCode: userOp.initCode ?? '0x',
          callData: userOp.callData ?? '0x',
          verificationGasLimit: 2000000,
          callGasLimit: 2000000,
          preVerificationGas: 60000,
          // use same maxFeePerGas and maxPriorityFeePerGas to ease testing prefund validation
          // otherwise it's tricky to calculate the prefund because of dynamic parameters like block.basefee
          // check UserOperation.sol#gasPrice()
          maxFeePerGas: 10000000000,
          maxPriorityFeePerGas: 20000000000,
          paymasterAndData: '0x',
          validAfter: 0,
          validUntil: 0,
          entryPoint: ENTRYPOINT_ADDRESS_V7
        }

        const encodedSignature = await this.signer._signTypedData(
          {
            chainId: this.chainId,
            verifyingContract: SAFE_4337_MODULE_ADDRESS
          },
          EIP712_SAFE_OPERATION_TYPE,
          finalUserOp
        )

        const signerAddress = await this.signer.getAddress()

        const signature = buildSignatureBytes([
          {
            signer: signerAddress as string,
            data: encodedSignature,
            dynamic: true
          }
        ])

        rpcUserOp = buildPackedUserOperationFromSafeUserOperation({
          safeOp: finalUserOp,
          signature
        })
      } else {
        const userOpHash = getUserOpHash(
          userOp,
          ENTRYPOINT_ADDRESS_V7,
          this.chainId
        )

        const safeInitOp = {
          userOpHash,
          validAfter: 0,
          validUntil: 0,
          entryPoint: ENTRYPOINT_ADDRESS_V7
        }

        const encodedSignature = await this.signer._signTypedData(
          {
            verifyingContract: SAFE_SIGNER_LAUNCHPAD_ADDRESS,
            chainId: this.chainId
          },
          EIP712_SAFE_INIT_OPERATION_TYPE,
          safeInitOp
        )

        const signature = ethers.solidityPacked(
          ['uint48', 'uint48', 'bytes'],
          [safeInitOp.validAfter, safeInitOp.validUntil, encodedSignature]
        )

        rpcUserOp = unpackUserOperationForRpc(userOp, signature)
      }
      return await SendUserOp(rpcUserOp, ENTRYPOINT_ADDRESS_V7)
    }
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
      const multisendData = encodeMulti(safeTxData, SAFE_MULTISEND_ADDRESS).data

      txData = {
        to: SAFE_MULTISEND_ADDRESS,
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

    console.log({ unsignedUserOperation })

    const userOpGasLimitEstimation = await estimateUserOpGasLimit(
      unsignedUserOperation
    )

    // Increase the gas limit by 50%, otherwise the user op will fail during simulation with "verification more than gas limit" error
    userOpGasLimitEstimation.verificationGasLimit = `0x${(
      (BigInt(userOpGasLimitEstimation.verificationGasLimit) * 20n) /
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
          (BigInt(feeData?.maxFeePerGas) * 50n) /
          10n
        ).toString(16)}`,
        maxPriorityFeePerGas: `0x${(
          (BigInt(feeData?.maxPriorityFeePerGas) * 50n) /
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
