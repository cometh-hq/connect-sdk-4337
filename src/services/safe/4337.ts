import { ethers } from 'ethers'

import { SAFE_SIGNER_LAUNCHPAD_ADDRESS } from '../../config'
import { UnsignedPackedUserOperation } from '../4337/types'
import { getUserOpInitCode, packGasParameters } from '../4337/userOpService'
import {
  getLaunchpadInitializeThenUserOpData,
  getSafeDeploymentData
} from '../safe/safeService'
import { SafeInitializer } from './types'

/**
 * Prepares a user operation with initialization.
 *
 * @param proxyFactoryAddress - The address of the proxy factory.
 * @param initializer - The safe initializer.
 * @param afterInitializationOpCall - Optional user operation call to be executed after initialization.
 * @param saltNonce - The salt nonce.
 * @returns The unsigned user operation.
 */
function prepareUserOperationWithInitialisation(
  proxyFactoryAddress: string,
  calldata: string,
  initializer: SafeInitializer,
  predictedSafeAddress: string,
  launchpadInitializer: string,
  saltNonce = ethers.ZeroHash
): UnsignedPackedUserOperation {
  const safeDeploymentData = getSafeDeploymentData(
    SAFE_SIGNER_LAUNCHPAD_ADDRESS,
    launchpadInitializer,
    saltNonce
  )

  const userOp = {
    sender: predictedSafeAddress,
    nonce: ethers.toBeHex(0),
    initCode: getUserOpInitCode(proxyFactoryAddress, safeDeploymentData),
    callData: getLaunchpadInitializeThenUserOpData(initializer, calldata),
    ...packGasParameters({
      callGasLimit: ethers.toBeHex(2000000),
      verificationGasLimit: ethers.toBeHex(2000000),
      maxFeePerGas: ethers.toBeHex(10000000000),
      maxPriorityFeePerGas: ethers.toBeHex(10000000000)
    }),
    preVerificationGas: ethers.toBeHex(2000000),
    paymasterAndData: '0x'
  }

  console.log({ userOp })

  return userOp
}

export { prepareUserOperationWithInitialisation }
