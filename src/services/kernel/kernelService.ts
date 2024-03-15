import { ethers } from 'ethers'
import { MetaTransaction } from 'ethers-multisend'

import { ENTRYPOINT_ADDRESS_V06, KERNEL_ADDRESSES } from '../../config'
import entrypointv6Abi from '../../contracts/abis/entrypoint_v0.6.json'
import executeAbi from '../../contracts/abis/kernel/execute.json'
import kernelFactoryAbi from '../../contracts/abis/kernel/factory.json'
import kernelSingletonAbi from '../../contracts/abis/kernel/singleton.json'
import { concatHex } from '../../utils/utils'
import { getEntrypointContractV6 } from '../4337/userOpService'

const { ACCOUNT_LOGIC, FACTORY_ADDRESS } = KERNEL_ADDRESSES
const kernelSingletonInterface = new ethers.Interface(kernelSingletonAbi)
const kernalFactoryInterface = new ethers.Interface(kernelFactoryAbi)
const executeInterface = new ethers.Interface(executeAbi)

const getKernelContract = (
  address: string,
  provider: ethers.JsonRpcProvider
): ethers.Contract => {
  return new ethers.Contract(address, kernelSingletonAbi, provider)
}

const encodeCallData = (tx: MetaTransaction | MetaTransaction[]) => {
  if (Array.isArray(tx)) {
    // Encode a batched call
    return executeInterface.encodeFunctionData('executeBatch', [
      tx.map((tx) => ({
        to: tx.to,
        value: tx.value,
        data: tx.data
      }))
    ])
  }
  // Encode a simple call
  return executeInterface.encodeFunctionData('execute', [
    tx.to,
    tx.value,
    tx.data,
    0
  ])
}

/**
 * Get the account initialization code for a kernel smart account
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param ecdsaValidatorAddress
 */
const getAccountInitCode = async ({
  index,
  accountLogicAddress,
  validatorAddress,
  accountAddress
}: {
  index: bigint
  accountLogicAddress: string
  validatorAddress: string
  accountAddress: string
}): Promise<string> => {
  // Build the account initialization data
  const initialisationData = kernelSingletonInterface.encodeFunctionData(
    'initialize',
    [validatorAddress, accountAddress]
  )

  return kernalFactoryInterface.encodeFunctionData('createAccount', [
    accountLogicAddress,
    initialisationData,
    index
  ])
}

const getInitCode = async ({
  index,
  accountLogicAddress,
  validatorAddress,
  accountAddress,
  provider
}: {
  index: bigint
  accountLogicAddress: string
  validatorAddress: string
  accountAddress: string
  provider: ethers.JsonRpcProvider
}) => {
  const isAccountDeployed = await isDeployed(accountAddress, provider)
  if (isAccountDeployed) return '0x'

  return concatHex([
    FACTORY_ADDRESS,
    await getAccountInitCode({
      index,
      accountLogicAddress,
      validatorAddress,
      accountAddress
    })
  ])
}

const isDeployed = async (
  walletAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<boolean> => {
  try {
    const account = getKernelContract(walletAddress, provider)
    const bytecode = await account.getDeployedCode()

    if (!bytecode) {
      return false
    } else {
      return true
    }
  } catch (error) {
    return false
  }
}

const getSenderAddress = async ({
  initCode,
  provider
}: {
  initCode: string
  provider: any
}): Promise<string> => {
  if (!initCode) {
    throw new Error('initCode must be provided')
  }

  const entrypoint = getEntrypointContractV6(provider)

  try {
    await entrypoint.getSenderAddress.staticCall(initCode)
  } catch (e) {
    const err = entrypoint.interface.parseError(e.data)

    if (!err) throw new Error('Invalid entrypoint address')

    if (err.name === 'SenderAddressResult' && err.args && err.args[0]) {
      return err.args[0] as string
    }

    throw e
  }

  throw new Error('Invalid entrypoint address')
}

export { encodeCallData, getInitCode, getSenderAddress }
