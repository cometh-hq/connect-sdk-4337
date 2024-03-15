import { ethers } from 'ethers'

import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from '../../config'
import { DEFAULT_CHAIN_ID } from '../../constants'
import EntrypointV6Abi from '../../contracts/abis/entrypoint_v0.6.json'
import EntrypointV7Abi from '../../contracts/abis/entrypoint_v0.7.json'
import { extractClientDataFields, extractSignature } from '../passkeys/utils'
import { getEip4337BundlerProvider } from './bundlerService'
import {
  PackedUserOperation,
  UnsignedPackedUserOperation,
  UnsignedUserOperation,
  UserOperation,
  UserOpGasLimitEstimation
} from './types'

const DUMMY_SIGNATURE: {
  ECDSA: string
  SAFE: string
} = {
  ECDSA:
    '0x00000000fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c',
  SAFE: '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e043aa8d1b19ca9387bdf05124650baec5c7ed57c04135f915b7a5fac9feeb29783063924cb9712ab0dd42f880317626ea82b4149f81f4e60d8ddeff9109d4619f0000000000000000000000000000000000000000000000000000000000000025a24f744b28d73f066bf3203d145765a7bc735e6328168c8b03e476da3ad0d8fe0400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e226f726967696e223a2268747470733a2f2f736166652e676c6f62616c220000'
}

function getEntrypointContractV6(
  provider: ethers.JsonRpcApiProvider
): ethers.Contract {
  return new ethers.Contract(ENTRYPOINT_ADDRESS_V06, EntrypointV6Abi, provider)
}

function getEntrypointContractV7(
  provider: ethers.JsonRpcApiProvider
): ethers.Contract {
  return new ethers.Contract(ENTRYPOINT_ADDRESS_V07, EntrypointV7Abi, provider)
}

/**
 * Generates the user operation initialization code.
 * @param proxyFactory - The address of the proxy factory.
 * @param deploymentData - The deployment data.
 * @returns The user operation initialization code.
 */
function getUserOpInitCode(
  proxyFactory: string,
  deploymentData: string
): string {
  const userOpInitCode = ethers.solidityPacked(
    ['address', 'bytes'],
    [proxyFactory, deploymentData]
  )
  return userOpInitCode
}

async function prepareUserOperation({
  entrypointAddress,
  account,
  calldata,
  provider,
  initCode
}: {
  entrypointAddress: string
  account: string
  calldata: string
  provider: ethers.JsonRpcProvider
  initCode: string
}): Promise<UnsignedPackedUserOperation> {
  if (entrypointAddress === ENTRYPOINT_ADDRESS_V06) {
    return await prepareUserOperationV6(account, calldata, provider, initCode)
  } else if (entrypointAddress === ENTRYPOINT_ADDRESS_V07) {
    return await prepareUserOperationV7(account, calldata, provider, initCode)
  }

  throw new Error('Unsupported entrypoint address')
}

async function prepareUserOperationV6(
  account: string,
  callData: string,
  provider: ethers.JsonRpcProvider,
  initCode: string
): Promise<any> {
  const entrypoint = getEntrypointContractV6(provider)
  const nonce = await entrypoint.getNonce(account, BigInt(0))

  return {
    sender: account,
    nonce,
    initCode,
    callData,
    callGasLimit: ethers.toBeHex(2000000),
    verificationGasLimit: ethers.toBeHex(2000000),
    maxFeePerGas: ethers.toBeHex(10000000000),
    maxPriorityFeePerGas: ethers.toBeHex(10000000000),
    preVerificationGas: ethers.toBeHex(2000000),
    paymasterAndData: '0x'
  }
}

async function prepareUserOperationV7(
  account: string,
  callData: string,
  provider: ethers.JsonRpcProvider,
  initCode: string
): Promise<UnsignedPackedUserOperation> {
  const entrypoint = getEntrypointContractV7(provider)
  const nonce = await entrypoint.getNonce(account, BigInt(0))

  return {
    sender: account,
    nonce,
    initCode,
    callData,
    ...packGasParameters({
      callGasLimit: ethers.toBeHex(2000000),
      verificationGasLimit: ethers.toBeHex(2000000),
      maxFeePerGas: ethers.toBeHex(10000000000),
      maxPriorityFeePerGas: ethers.toBeHex(10000000000)
    }),
    preVerificationGas: ethers.toBeHex(2000000),
    paymasterAndData: '0x'
  }
}

/**
 * Estimates the gas limit for a user operation. A dummy signature will be used.
 * @param userOp - The user operation to estimate gas limit for.
 * @param entryPointAddress - The entry point address. Default value is ENTRYPOINT_ADDRESS_V07.
 * @returns A promise that resolves to the estimated gas limit for the user operation.
 */
function estimateUserOpGasLimit(
  userOp: UnsignedPackedUserOperation,
  entryPointAddress: string
): Promise<UserOpGasLimitEstimation> {
  const provider = getEip4337BundlerProvider()

  const rpcUserOp = unpackUserOperationForRpc(
    userOp,
    DUMMY_SIGNATURE.ECDSA,
    entryPointAddress
  )

  const estimation = provider.send('eth_estimateUserOperationGas', [
    rpcUserOp,
    entryPointAddress
  ])

  return estimation
}

/**
 * Unpacks a user operation for use over the bundler RPC.
 * @param userOp The user operation to unpack.
 * @param signature The signature bytes for the user operation.
 * @returns An unpacked `UserOperation` that can be used over bunlder RPC.
 */
function unpackUserOperationForRpc(
  userOp: any,
  signature: ethers.BytesLike,
  entryPointAddress: string
): UserOperation {
  let initFields
  let paymasterFields
  let gasEstimationFields

  if (entryPointAddress === ENTRYPOINT_ADDRESS_V06) {
    initFields = { initCode: userOp.initCode }
    paymasterFields = { paymasterAndData: userOp.paymasterAndData }
    gasEstimationFields = {
      maxFeePerGas: ethers.toBeHex(userOp.maxFeePerGas),
      maxPriorityFeePerGas: ethers.toBeHex(userOp.maxPriorityFeePerGas)
    }
  } else {
    initFields =
      ethers.dataLength(userOp.initCode) > 0
        ? {
            factory: ethers.getAddress(
              ethers.dataSlice(userOp.initCode, 0, 20)
            ),
            factoryData: ethers.dataSlice(userOp.initCode, 20)
          }
        : {}
    paymasterFields =
      ethers.dataLength(userOp.paymasterAndData) > 0
        ? {
            paymaster: ethers.getAddress(
              ethers.dataSlice(userOp.initCode, 0, 20)
            ),
            paymasterVerificationGasLimit: ethers.toBeHex(
              ethers.dataSlice(userOp.paymasterAndData, 20, 36)
            ),
            paymasterPostOpGasLimit: ethers.toBeHex(
              ethers.dataSlice(userOp.paymasterAndData, 36, 52)
            ),
            paymasterData: ethers.dataSlice(userOp.paymasterAndData, 52)
          }
        : {}

    gasEstimationFields = {
      preVerificationGas: ethers.toBeHex(userOp.preVerificationGas),
      callGasLimit: ethers.toBeHex(
        ethers.dataSlice(userOp.accountGasLimits, 16, 32)
      ),
      verificationGasLimit: ethers.toBeHex(
        ethers.dataSlice(userOp.accountGasLimits, 0, 16)
      ),
      maxFeePerGas: ethers.toBeHex(ethers.dataSlice(userOp.gasFees, 16, 32)),
      maxPriorityFeePerGas: ethers.toBeHex(
        ethers.dataSlice(userOp.gasFees, 0, 16)
      )
    }
  }

  return {
    sender: ethers.getAddress(userOp.sender),
    nonce: ethers.toBeHex(userOp.nonce),
    ...initFields,
    callData: ethers.hexlify(userOp.callData),
    ...gasEstimationFields,
    ...paymasterFields,
    signature: ethers.hexlify(signature)
  }
}

/**
 * Pasks a user operation gas parameters.
 * @param op The UserOperation gas parameters to pack.
 * @returns The packed UserOperation parameters.
 */
function packGasParameters(
  op: Pick<
    UserOperation,
    | 'verificationGasLimit'
    | 'callGasLimit'
    | 'maxPriorityFeePerGas'
    | 'maxFeePerGas'
  >
): Pick<PackedUserOperation, 'accountGasLimits' | 'gasFees'> {
  return {
    accountGasLimits: ethers.solidityPacked(
      ['uint128', 'uint128'],
      [op.verificationGasLimit, op.callGasLimit]
    ),
    gasFees: ethers.solidityPacked(
      ['uint128', 'uint128'],
      [op.maxPriorityFeePerGas, op.maxFeePerGas]
    )
  }
}

/**
 * Packs a UserOperation object into a string using the defaultAbiCoder.
 * @param op The UserOperation object to pack.
 * @returns The packed UserOperation as a string.
 */
function packUserOpData(
  op: UnsignedPackedUserOperation | UnsignedUserOperation,
  entryPointAddress: string
): string {
  if (entryPointAddress === ENTRYPOINT_ADDRESS_V06) {
    return packUserOpDataV06(op as UnsignedUserOperation)
  } else {
    return packUserOpDataV07(op as UnsignedPackedUserOperation)
  }
}

function packUserOpDataV06(op: UnsignedUserOperation): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    [
      'address', // sender
      'uint256', // nonce
      'bytes32', // initCode
      'bytes32', // callData
      'uint256', // callGasLimit
      'uint256', // verificationGasLimit
      'uint256', // preVerificationGas
      'uint256', // maxFeePerGas
      'uint256', // maxPriorityFeePerGas
      'bytes32' // paymasterAndData
    ],
    [
      op.sender,
      op.nonce,
      ethers.keccak256(op.initCode),
      ethers.keccak256(op.callData),
      op.callGasLimit,
      op.verificationGasLimit,
      op.preVerificationGas,
      op.maxFeePerGas,
      op.maxPriorityFeePerGas,
      ethers.keccak256(op.paymasterAndData)
    ]
  )
}

function packUserOpDataV07(op: UnsignedPackedUserOperation): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    [
      'address', // sender
      'uint256', // nonce
      'bytes32', // initCode
      'bytes32', // callData
      'bytes32', // accountGasLimits
      'uint256', // preVerificationGas
      'bytes32', // gasFees
      'bytes32' // paymasterAndData
    ],
    [
      op.sender,
      op.nonce,
      ethers.keccak256(op.initCode),
      ethers.keccak256(op.callData),
      op.accountGasLimits,
      op.preVerificationGas,
      op.gasFees,
      ethers.keccak256(op.paymasterAndData)
    ]
  )
}

/**
 * Calculates the hash of a user operation.
 * @param op The user operation.
 * @param entryPoint The entry point.
 * @param chainId The chain ID.
 * @returns The hash of the user operation.
 */
function getUserOpHash(
  op: UnsignedPackedUserOperation | UnsignedUserOperation,
  entryPointAddress: string,
  chainId: ethers.BigNumberish = DEFAULT_CHAIN_ID
): string {
  const userOpHash = ethers.keccak256(packUserOpData(op, entryPointAddress))

  const enc = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPointAddress, chainId]
  )
  return ethers.keccak256(enc)
}

const buildPackedUserOperationFromUserOperation = ({
  userOp,
  signature
}: {
  userOp: any
  signature: string
}): any => {
  const initFields =
    ethers.dataLength(userOp.initCode) > 0
      ? {
          factory: ethers.getAddress(ethers.dataSlice(userOp.initCode, 0, 20)),
          factoryData: ethers.dataSlice(userOp.initCode, 20)
        }
      : {}
  const paymasterFields =
    ethers.dataLength(userOp.paymasterAndData) > 0
      ? {
          paymaster: ethers.getAddress(
            ethers.dataSlice(userOp.initCode, 0, 20)
          ),
          paymasterVerificationGasLimit: ethers.toBeHex(
            ethers.dataSlice(userOp.paymasterAndData, 20, 36)
          ),
          paymasterPostOpGasLimit: ethers.toBeHex(
            ethers.dataSlice(userOp.paymasterAndData, 36, 52)
          ),
          paymasterData: ethers.dataSlice(userOp.paymasterAndData, 52)
        }
      : {}

  return {
    sender: userOp.safe,
    nonce: ethers.toBeHex(userOp.nonce),
    ...initFields,
    callData: ethers.hexlify(userOp.callData),
    callGasLimit: ethers.toBeHex(userOp.callGasLimit),
    preVerificationGas: ethers.toBeHex(userOp.preVerificationGas),
    verificationGasLimit: ethers.toBeHex(userOp.verificationGasLimit),
    maxFeePerGas: ethers.toBeHex(userOp.maxFeePerGas),
    maxPriorityFeePerGas: ethers.toBeHex(userOp.maxPriorityFeePerGas),
    ...paymasterFields,
    signature: ethers.solidityPacked(
      ['uint48', 'uint48', 'bytes'],
      [userOp.validAfter, userOp.validUntil, signature]
    )
  }
}

async function SendUserOp(
  userOp: UserOperation,
  entryPoint: string = ENTRYPOINT_ADDRESS_V07
): Promise<string | undefined> {
  try {
    return await getEip4337BundlerProvider().send('eth_sendUserOperation', [
      userOp,
      entryPoint
    ])
  } catch (err) {
    console.log(err)
  }
}

export {
  buildPackedUserOperationFromUserOperation,
  DUMMY_SIGNATURE,
  estimateUserOpGasLimit,
  extractClientDataFields,
  extractSignature,
  getEntrypointContractV6,
  getUserOpHash,
  getUserOpInitCode,
  packGasParameters,
  prepareUserOperation,
  SendUserOp,
  unpackUserOperationForRpc
}
