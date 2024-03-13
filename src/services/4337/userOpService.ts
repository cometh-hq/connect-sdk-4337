import { ethers } from 'ethers'

import {
  ENTRYPOINT_ADDRESS,
  SAFE_4337_MODULE_ADDRESS,
  SAFE_SIGNER_LAUNCHPAD_ADDRESS
} from '../../config'
import { DEFAULT_CHAIN_ID, EIP712_SAFE_OPERATION_TYPE } from '../../constants'
import { hexStringToUint8Array } from '../../utils'
import {
  buildSignatureBytes,
  extractClientDataFields,
  extractSignature
} from '../../utils/passkeys'
import { PasskeyLocalStorageFormat } from '../passkeys/passkeys'
import { getSignerAddressFromPubkeyCoords } from '../passkeys/passkeyService'
import {
  getEntrypointContract,
  getLaunchpadInitializeThenUserOpData,
  getSafeDeploymentData,
  SafeInitializer
} from '../safe/safeService'
import { getEip4337BundlerProvider } from './bundlerService'
import {
  PackedUserOperation,
  UnsignedPackedUserOperation,
  UserOperation,
  UserOpGasLimitEstimation
} from './types'

// Dummy signature for gas estimation. We require it so the estimation doesn't revert
// if the signature is absent
const DUMMY_SIGNATURE =
  '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e043aa8d1b19ca9387bdf05124650baec5c7ed57c04135f915b7a5fac9feeb29783063924cb9712ab0dd42f880317626ea82b4149f81f4e60d8ddeff9109d4619f0000000000000000000000000000000000000000000000000000000000000025a24f744b28d73f066bf3203d145765a7bc735e6328168c8b03e476da3ad0d8fe0400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e226f726967696e223a2268747470733a2f2f736166652e676c6f62616c220000'

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

async function prepareUserOperation(
  safe: string,
  calldata: string,
  provider: ethers.JsonRpcProvider
): Promise<UnsignedPackedUserOperation> {
  const entrypoint = getEntrypointContract(provider)
  const nonce = await entrypoint.getNonce(safe, BigInt(0))

  return {
    sender: safe,
    nonce,
    initCode: '0x',
    callData: calldata,
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

  console.log({ safeDeploymentData })

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

/**
 * Estimates the gas limit for a user operation. A dummy signature will be used.
 * @param userOp - The user operation to estimate gas limit for.
 * @param entryPointAddress - The entry point address. Default value is ENTRYPOINT_ADDRESS.
 * @returns A promise that resolves to the estimated gas limit for the user operation.
 */
function estimateUserOpGasLimit(
  userOp: UnsignedPackedUserOperation,
  entryPointAddress = ENTRYPOINT_ADDRESS
): Promise<UserOpGasLimitEstimation> {
  const provider = getEip4337BundlerProvider()
  const rpcUserOp = unpackUserOperationForRpc(userOp, DUMMY_SIGNATURE)

  console.log({ rpcUserOp })
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
  signature: ethers.BytesLike
): UserOperation {
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
    sender: ethers.getAddress(userOp.sender),
    nonce: ethers.toBeHex(userOp.nonce),
    ...initFields,
    callData: ethers.hexlify(userOp.callData),
    callGasLimit: ethers.toBeHex(
      ethers.dataSlice(userOp.accountGasLimits, 16, 32)
    ),
    verificationGasLimit: ethers.toBeHex(
      ethers.dataSlice(userOp.accountGasLimits, 0, 16)
    ),
    preVerificationGas: ethers.toBeHex(userOp.preVerificationGas),
    maxFeePerGas: ethers.toBeHex(ethers.dataSlice(userOp.gasFees, 16, 32)),
    maxPriorityFeePerGas: ethers.toBeHex(
      ethers.dataSlice(userOp.gasFees, 0, 16)
    ),
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
function packUserOpData(op: UnsignedPackedUserOperation): string {
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
  op: UnsignedPackedUserOperation,
  entryPoint: string = ENTRYPOINT_ADDRESS,
  chainId: ethers.BigNumberish = DEFAULT_CHAIN_ID
): string {
  const userOpHash = ethers.keccak256(packUserOpData(op))
  const enc = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPoint, chainId]
  )
  return ethers.keccak256(enc)
}

type Assertion = {
  response: AuthenticatorAssertionResponse
}

/**
 * Signs and sends a user operation to the specified entry point on the blockchain.
 * @param userOp The unsigned user operation to sign and send.
 * @param passkey The passkey used for signing the user operation.
 * @param entryPoint The entry point address on the blockchain. Defaults to ENTRYPOINT_ADDRESS if not provided.
 * @param chainId The chain ID of the blockchain. Defaults to DEFAULT_CHAIN_ID if not provided.
 * @returns User Operation hash promise.
 * @throws An error if signing the user operation fails.
 */
async function signUserOpWithInitialisation(
  userOp: UnsignedPackedUserOperation,
  passkey: PasskeyLocalStorageFormat,
  entryPoint: string = ENTRYPOINT_ADDRESS,
  chainId: ethers.BigNumberish = DEFAULT_CHAIN_ID
): Promise<UserOperation> {
  const userOpHash = getUserOpHash(userOp, entryPoint, chainId)

  const safeInitOp = {
    userOpHash,
    validAfter: 0,
    validUntil: 0,
    entryPoint: ENTRYPOINT_ADDRESS
  }

  const safeInitOpHash = ethers.TypedDataEncoder.hash(
    { verifyingContract: SAFE_SIGNER_LAUNCHPAD_ADDRESS, chainId },
    {
      SafeInitOp: [
        { type: 'bytes32', name: 'userOpHash' },
        { type: 'uint48', name: 'validAfter' },
        { type: 'uint48', name: 'validUntil' },
        { type: 'address', name: 'entryPoint' }
      ]
    },
    safeInitOp
  )

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: ethers.getBytes(safeInitOpHash),
      allowCredentials: [
        { type: 'public-key', id: hexStringToUint8Array(passkey.rawId) }
      ],
      userVerification: 'required'
    }
  })) as Assertion | null

  if (!assertion) {
    throw new Error('Failed to sign user operation')
  }

  const signature = ethers.solidityPacked(
    ['uint48', 'uint48', 'bytes'],
    [
      safeInitOp.validAfter,
      safeInitOp.validUntil,
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes', 'bytes', 'uint256[2]'],
        [
          new Uint8Array(assertion.response.authenticatorData),
          extractClientDataFields(assertion.response),
          extractSignature(assertion.response)
        ]
      )
    ]
  )

  return unpackUserOperationForRpc(userOp, signature)
}

export const buildPackedUserOperationFromSafeUserOperation = ({
  safeOp,
  signature
}: {
  safeOp: any
  signature: string
}): any => {
  const initFields =
    ethers.dataLength(safeOp.initCode) > 0
      ? {
          factory: ethers.getAddress(ethers.dataSlice(safeOp.initCode, 0, 20)),
          factoryData: ethers.dataSlice(safeOp.initCode, 20)
        }
      : {}
  const paymasterFields =
    ethers.dataLength(safeOp.paymasterAndData) > 0
      ? {
          paymaster: ethers.getAddress(
            ethers.dataSlice(safeOp.initCode, 0, 20)
          ),
          paymasterVerificationGasLimit: ethers.toBeHex(
            ethers.dataSlice(safeOp.paymasterAndData, 20, 36)
          ),
          paymasterPostOpGasLimit: ethers.toBeHex(
            ethers.dataSlice(safeOp.paymasterAndData, 36, 52)
          ),
          paymasterData: ethers.dataSlice(safeOp.paymasterAndData, 52)
        }
      : {}

  return {
    sender: safeOp.safe,
    nonce: ethers.toBeHex(safeOp.nonce),
    ...initFields,
    callData: ethers.hexlify(safeOp.callData),
    callGasLimit: ethers.toBeHex(safeOp.callGasLimit),
    preVerificationGas: ethers.toBeHex(safeOp.preVerificationGas),
    verificationGasLimit: ethers.toBeHex(safeOp.verificationGasLimit),
    maxFeePerGas: ethers.toBeHex(safeOp.maxFeePerGas),
    maxPriorityFeePerGas: ethers.toBeHex(safeOp.maxPriorityFeePerGas),
    ...paymasterFields,
    signature: ethers.solidityPacked(
      ['uint48', 'uint48', 'bytes'],
      [safeOp.validAfter, safeOp.validUntil, signature]
    )
  }
}

async function signUserOp(
  userOp: UnsignedPackedUserOperation,
  passkey: PasskeyLocalStorageFormat,
  entryPoint: string = ENTRYPOINT_ADDRESS,
  chainId: ethers.BigNumberish = DEFAULT_CHAIN_ID
): Promise<any> {
  const finalUserOp = {
    safe: userOp.sender,
    nonce: userOp.nonce,
    initCode: userOp.initCode ?? '0x',
    callData: userOp.callData ?? '0x',
    verificationGasLimit: 500000,
    callGasLimit: 2000000,
    preVerificationGas: 60000,
    // use same maxFeePerGas and maxPriorityFeePerGas to ease testing prefund validation
    // otherwise it's tricky to calculate the prefund because of dynamic parameters like block.basefee
    // check UserOperation.sol#gasPrice()
    maxFeePerGas: 10000000000,
    maxPriorityFeePerGas: 10000000000,
    paymasterAndData: '0x',
    validAfter: 0,
    validUntil: 0,
    entryPoint
  }

  const safeOpHash = ethers.TypedDataEncoder.hash(
    {
      chainId,
      verifyingContract: SAFE_4337_MODULE_ADDRESS
    },
    EIP712_SAFE_OPERATION_TYPE,
    finalUserOp
  )

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: ethers.getBytes(safeOpHash),
      allowCredentials: [
        { type: 'public-key', id: hexStringToUint8Array(passkey.rawId) }
      ],
      userVerification: 'required'
    }
  })) as Assertion | null

  if (!assertion) {
    throw new Error('Failed to sign user operation')
  }

  const signerAddress = getSignerAddressFromPubkeyCoords(
    passkey!.pubkeyCoordinates.x,
    passkey!.pubkeyCoordinates.y
  )

  const signature = buildSignatureBytes([
    {
      signer: signerAddress as string,
      data: ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes', 'bytes', 'uint256[2]'],
        [
          new Uint8Array(assertion.response.authenticatorData),
          extractClientDataFields(assertion.response),
          extractSignature(assertion.response)
        ]
      ),
      dynamic: true
    }
  ])

  return buildPackedUserOperationFromSafeUserOperation({
    safeOp: finalUserOp,
    signature
  })
}

async function SendUserOp(
  userOp: UserOperation,
  entryPoint: string = ENTRYPOINT_ADDRESS
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
  estimateUserOpGasLimit,
  extractClientDataFields,
  extractSignature,
  getUserOpHash,
  packGasParameters,
  prepareUserOperation,
  prepareUserOperationWithInitialisation,
  SendUserOp,
  signUserOp,
  signUserOpWithInitialisation
}
