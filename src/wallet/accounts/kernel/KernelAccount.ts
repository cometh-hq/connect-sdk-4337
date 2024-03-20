import { ethers, HDNodeWallet, Wallet } from 'ethers'
import { MetaTransaction } from 'ethers-multisend'

import { ENTRYPOINT_ADDRESS_V06, KERNEL_ADDRESSES } from '../../../config'
import { DEFAULT_CHAIN_ID, DEFAULT_RPC_TARGET } from '../../../constants'
import {
  UnsignedPackedUserOperation,
  UserOperation
} from '../../../services/4337/types'
import {
  buildPackedUserOperationFromUserOperation,
  estimateUserOpGasLimit,
  getUserOpHash,
  packGasParameters,
  prepareUserOperation,
  SendUserOp,
  unpackUserOperationForRpc
} from '../../../services/4337/userOpService'
import { API } from '../../../services/API'
import {
  encodeCallData,
  getInitCode,
  getSenderAddress
} from '../../../services/kernel/kernelService'
import { isDeployed } from '../../../services/safe/safeService'
import { SafeInitializer } from '../../../services/safe/types'
import { deepHexlify } from '../../../utils'
import { AuthAdaptor } from '../../adaptors'
import {
  EmptyBatchTransactionError,
  NoSignerFoundError,
  WalletNotConnectedError
} from '../../errors'
import { PasskeySigner } from '../../signers'
import { BaseAccount, SponsoredTransaction } from '../../types'

const { ACCOUNT_LOGIC, ECDSA_VALIDATOR } = KERNEL_ADDRESSES

interface AccountConfig {
  transactionTimeout?: number
  baseUrl?: string
}

export class KernelAccount implements BaseAccount {
  readonly chainId: number
  private provider: ethers.JsonRpcProvider
  private walletAddress?: string
  private isWalletDeployed?: boolean
  private launchpadInitializer?: string
  private initializer?: SafeInitializer
  public transactionTimeout?: number
  public signer?: HDNodeWallet | Wallet | PasskeySigner | ethers.JsonRpcSigner

  private sponsoredAddresses?: SponsoredTransaction[]

  constructor(/* { transactionTimeout, baseUrl }: AccountConfig */) {
    this.provider = new ethers.JsonRpcProvider(DEFAULT_RPC_TARGET)
    this.chainId = DEFAULT_CHAIN_ID
    //this.transactionTimeout = transactionTimeout
  }

  /**
   * Connection Section
   */

  public async connect(walletAddress?: string): Promise<void> {
    const wallet = Wallet.createRandom()
    this.signer = new Wallet(wallet.privateKey, this.provider)

    console.log('signer', this.signer.address)

    if (this.signer instanceof Wallet) {
      this.walletAddress = await this.predictWalletAddress({
        accountLogicAddress: ACCOUNT_LOGIC,
        validatorAddress: ECDSA_VALIDATOR,
        accountAddress: this.signer.address,
        provider: this.provider
      })

      console.log('wallet', this.walletAddress)

      this.isWalletDeployed = await isDeployed(
        this.walletAddress,
        this.provider
      )
    }
  }

  async createWallet(walletAddress: string): Promise<void> {}

  private async predictWalletAddress({
    accountLogicAddress,
    validatorAddress,
    accountAddress,
    provider
  }: {
    accountLogicAddress: string
    validatorAddress: string
    accountAddress: string
    provider: ethers.JsonRpcProvider
  }): Promise<string> {
    // Find the init code for this account
    const initCode = await getInitCode({
      index: 0n,
      accountLogicAddress,
      validatorAddress,
      accountAddress,
      provider
    })

    return getSenderAddress({
      initCode,
      provider
    })
  }

  /*   async waitPasskeySignerDeployment(publicKeyId: string): Promise<void> {
    const passkeySigner = await this.API.getPasskeySignerByPublicKeyId(
      publicKeyId
    )

    await waitPasskeySignerDeployment(
      passkeySigner.deploymentParams.P256FactoryContract,
      passkeySigner.publicKeyX,
      passkeySigner.publicKeyY,
      this.provider
    )
  } */

  public getAddress(): string {
    return this.walletAddress ?? ''
  }

  public getProvider(): ethers.JsonRpcProvider {
    return this.provider
  }

  public async _signAndSendTransaction(
    userOp: UnsignedPackedUserOperation
  ): Promise<string | undefined> {
    if (!this.signer) throw new NoSignerFoundError()

    const finalUserOp = {
      sender: userOp.sender,
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
      paymasterAndData: '0x'
    }

    console.log({ finalUserOp })

    const userOpHash = getUserOpHash(finalUserOp, ENTRYPOINT_ADDRESS_V06)
    console.log({ userOpHash })

    if (this.signer instanceof Wallet) {
      console.log('yo')
      const signature = await this.signer.signMessage(userOpHash)

      console.log({ signature })

      const rpcUserOp = {
        sender: finalUserOp.sender,
        nonce: ethers.toBeHex(finalUserOp.nonce),
        initCode: finalUserOp.initCode,
        callData: ethers.hexlify(finalUserOp.callData),
        callGasLimit: ethers.toBeHex(finalUserOp.callGasLimit),
        preVerificationGas: ethers.toBeHex(finalUserOp.preVerificationGas),
        verificationGasLimit: ethers.toBeHex(finalUserOp.verificationGasLimit),
        maxFeePerGas: ethers.toBeHex(finalUserOp.maxFeePerGas),
        maxPriorityFeePerGas: ethers.toBeHex(finalUserOp.maxPriorityFeePerGas),
        paymasterAndData: finalUserOp.paymasterAndData,
        signature
      } as UserOperation

      return await SendUserOp(rpcUserOp, ENTRYPOINT_ADDRESS_V06)
    }
  }

  public async sendTransaction(
    tx: MetaTransaction
  ): Promise<string | undefined> {
    const unsignedUserOp = await this.buildUserOp(tx)

    const userOpHash = await this._signAndSendTransaction(unsignedUserOp)

    if (unsignedUserOp.nonce == 0) this.isWalletDeployed = true

    return userOpHash
  }

  public async sendBatchTransactions(
    tx: MetaTransaction[]
  ): Promise<string | undefined> {
    if (tx.length === 0) {
      throw new EmptyBatchTransactionError()
    }
    const unsignedUserOp = await this.buildUserOp(tx)

    const userOpHash = await this._signAndSendTransaction(unsignedUserOp)

    if (unsignedUserOp.nonce == 0) this.isWalletDeployed = true

    return userOpHash
  }

  public async buildUserOp(
    tx: MetaTransaction | MetaTransaction[]
  ): Promise<UnsignedPackedUserOperation> {
    if (!this.walletAddress) throw new WalletNotConnectedError()

    const calldata = encodeCallData(tx)

    console.log({ calldata })

    const initCode = await getInitCode({
      index: 0n,
      accountLogicAddress: ACCOUNT_LOGIC,
      validatorAddress: ECDSA_VALIDATOR,
      accountAddress: (this.signer! as Wallet).address,
      provider: this.provider
    })

    const unsignedUserOperation = await prepareUserOperation({
      entrypointAddress: ENTRYPOINT_ADDRESS_V06,
      account: this.walletAddress!,
      calldata,
      provider: this.provider,
      initCode
    })

    const userOpGasLimitEstimation = await estimateUserOpGasLimit(
      unsignedUserOperation,
      ENTRYPOINT_ADDRESS_V06
    )

    console.log({ userOpGasLimitEstimation })

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
      ...unsignedUserOperation
      /*   ...packGasParameters({
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
      ).toString(16)}` */
    } as any
  }
}
