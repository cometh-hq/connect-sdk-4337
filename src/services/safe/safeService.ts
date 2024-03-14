import { ethers, getBytes } from 'ethers'

import {
  ENTRYPOINT_ADDRESS,
  MULTISEND_ADDRESS,
  SAFE_4337_MODULE_ADDRESS,
  SAFE_PROXY_FACTORY_ADDRESS,
  SAFE_SIGNER_LAUNCHPAD_ADDRESS,
  WEBAUTHN_SIGNER_FACTORY_ADDRESS
} from '../../config'
import { SafeProxyBytecode } from '../../constants'
import enableModuleAbi from '../../contracts/abis/enablemodule.json'
import EntrypointAbi from '../../contracts/abis/entrypoint.json'
import multisendAbi from '../../contracts/abis/Multisend.json'
import SafeSingletonAbi from '../../contracts/abis/safe.json'
import Safe4337ModuleAbi from '../../contracts/abis/safe4337ModuleAbi.json'
import SetupModuleSetupAbi from '../../contracts/abis/safeModuleSetup.json'
import SafeProxyFactoryAbi from '../../contracts/abis/safeProxyFactory.json'
import SafeSignerLaunchpadAbi from '../../contracts/abis/safeSignerLaunchpadAbi.json'
import WebAuthnSignerAbi from '../../contracts/abis/safeWebauthnSigner.json'
import WebAuthnSignerFactoryAbi from '../../contracts/abis/safeWebauthnSignerFactory.json'
import { WalletNotDeployedError } from '../../wallet/errors'
import { UserOperation } from '../4337/types'
import { API } from '../API'
import { SafeInitializer } from './types'

function getEntrypointContract(
  provider: ethers.JsonRpcApiProvider
): ethers.Contract {
  return new ethers.Contract(ENTRYPOINT_ADDRESS, EntrypointAbi, provider)
}

function getSafeContract(
  address: string,
  provider: ethers.JsonRpcProvider
): ethers.Contract {
  return new ethers.Contract(address, SafeSingletonAbi, provider)
}

function getSafeFactoryContract(
  address: string,
  provider: ethers.JsonRpcProvider
): ethers.Contract {
  return new ethers.Contract(address, SafeProxyFactoryAbi, provider)
}

/**
 * Creates an instance of SafeSignerLaunchpad contract using the provided JSON-RPC provider.
 *
 * @param provider The JSON-RPC provider used to interact with the blockchain.
 * @returns An instance of SafeSignerLaunchpad contract.
 */
function getSafeSignerLaunchpadContract(
  provider: ethers.JsonRpcProvider
): ethers.Contract {
  return new ethers.Contract(
    SAFE_SIGNER_LAUNCHPAD_ADDRESS,
    SafeSignerLaunchpadAbi,
    provider
  )
}

/**
 * Returns an instance of the Safe4337Module contract.
 *
 * @param provider - The JSON-RPC provider used to interact with the Ethereum network.
 * @returns An instance of the Safe4337Module contract.
 */
function getSafe4337ModuleContract(
  provider: ethers.JsonRpcProvider
): ethers.Contract {
  return new ethers.Contract(
    SAFE_4337_MODULE_ADDRESS,
    Safe4337ModuleAbi,
    provider
  )
}

/**
 * Returns an instance of the WebAuthnSignerFactory contract.
 *
 * @param provider - The JSON-RPC provider used to interact with the Ethereum network.
 * @returns An instance of the WebAuthnSignerFactory contract.
 */
function getWebAuthnSignerFactoryContract(
  address: string,
  provider: ethers.JsonRpcProvider
): ethers.Contract {
  return new ethers.Contract(
    WEBAUTHN_SIGNER_FACTORY_ADDRESS,
    WebAuthnSignerFactoryAbi,
    provider
  )
}

/**
 * Creates a WebAuthnSigner contract instance.
 *
 * @param provider - The JSON-RPC provider.
 * @param address - The address of the contract.
 * @returns The WebAuthnSigner contract instance.
 */
function getWebAuthnSignerContract(
  provider: ethers.JsonRpcProvider,
  address: string
): ethers.Contract {
  return new ethers.Contract(address, WebAuthnSignerAbi, provider)
}

function getInitHash(
  safeInitializer: SafeInitializer,
  chainId: ethers.BigNumberish
): string {
  const safeInitHash = ethers.TypedDataEncoder.hash(
    { verifyingContract: SAFE_SIGNER_LAUNCHPAD_ADDRESS, chainId },
    {
      SafeInit: [
        { type: 'address', name: 'singleton' },
        { type: 'address', name: 'signerFactory' },
        { type: 'bytes', name: 'signerData' },
        { type: 'address', name: 'setupTo' },
        { type: 'bytes', name: 'setupData' },
        { type: 'address', name: 'fallbackHandler' }
      ]
    },
    safeInitializer
  )

  return safeInitHash
}

function getLaunchpadInitializer(
  safeInitHash: string,
  optionalCallAddress = ethers.ZeroAddress,
  optionalCalldata = '0x'
): string {
  const safeSignerLaunchpadInterface = new ethers.Interface(
    SafeSignerLaunchpadAbi
  )

  const launchpadInitializer = safeSignerLaunchpadInterface.encodeFunctionData(
    'preValidationSetup',
    [safeInitHash, optionalCallAddress, optionalCalldata]
  )

  return launchpadInitializer
}

/**
 * Generates the deployment data for creating a new Safe contract proxy with a specified singleton address, initializer, and salt nonce.
 * @param singleton The address of the singleton contract.
 * @param initializer The initialization data for the Safe contract.
 * @param saltNonce The salt nonce for the Safe contract.
 * @returns The deployment data for creating the Safe contract proxy.
 */
function getSafeDeploymentData(
  singleton: string,
  initializer = '0x',
  saltNonce = '0x'
): string {
  const safeProxyFactoryInterface = new ethers.Interface(SafeProxyFactoryAbi)
  const deploymentData = safeProxyFactoryInterface.encodeFunctionData(
    'createProxyWithNonce',
    [singleton, initializer, saltNonce]
  )

  return deploymentData
}

/**
 * Calculates the address of a safe contract based on the initializer, factory address, singleton address, and salt nonce.
 * @param initializer - The initializer bytes.
 * @param factoryAddress - The factory address used to create the safe contract. Defaults to SAFE_PROXY_FACTORY_ADDRESS.
 * @param singleton - The singleton address used for the safe contract. Defaults to SAFE_SIGNER_LAUNCHPAD_ADDRESS.
 * @param saltNonce - The salt nonce used for the safe contract. Defaults to ethers.ZeroHash.
 * @returns The address of the safe contract.
 */
function getSafeAddressWithLaunchpad(
  initializer: string,
  factoryAddress = SAFE_PROXY_FACTORY_ADDRESS,
  singleton = SAFE_SIGNER_LAUNCHPAD_ADDRESS,
  saltNonce: ethers.BigNumberish = ethers.ZeroHash
): string {
  const deploymentCode = ethers.solidityPacked(
    ['bytes', 'uint256'],
    [SafeProxyBytecode, singleton]
  )
  const salt = ethers.solidityPackedKeccak256(
    ['bytes32', 'uint256'],
    [ethers.solidityPackedKeccak256(['bytes'], [initializer]), saltNonce]
  )
  return ethers.getCreate2Address(
    factoryAddress,
    salt,
    ethers.keccak256(deploymentCode)
  )
}

/**
 * Calculates the address of a safe contract based on the initializer, factory address, singleton address, and salt nonce.
 * @param initializer - The initializer bytes.
 * @param factoryAddress - The factory address used to create the safe contract. Defaults to SAFE_PROXY_FACTORY_ADDRESS.
 * @param singleton - The singleton address used for the safe contract. Defaults to SAFE_SIGNER_LAUNCHPAD_ADDRESS.
 * @param saltNonce - The salt nonce used for the safe contract. Defaults to ethers.ZeroHash.
 * @returns The address of the safe contract.
 */
async function getSafeAddress(
  ownerAddress: string,
  provider: ethers.JsonRpcProvider,
  factoryAddress = SAFE_PROXY_FACTORY_ADDRESS,
  singleton = SAFE_SIGNER_LAUNCHPAD_ADDRESS,
  saltNonce = 'COMETH'
): Promise<string> {
  const enableModulesInterface = new ethers.Interface(enableModuleAbi)
  const safeInterface = new ethers.Interface(SafeSingletonAbi)
  const multisendInterface = new ethers.Interface(multisendAbi)

  const safeFactoryInstance = getSafeFactoryContract(factoryAddress, provider)

  const enableModuleData = enableModulesInterface.encodeFunctionData(
    'enableModules',
    [[SAFE_4337_MODULE_ADDRESS]]
  )

  const addModulesLibAddress = '0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb'

  const tx = {
    to: addModulesLibAddress,
    data: enableModuleData,
    value: '0x00',
    operation: 1
  }

  const encodedData = ethers
    .solidityPacked(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [tx.operation, tx.to, tx.value, getBytes(tx.data)!.length, tx.data]
    )
    .slice(2)

  const multiSendCallData = multisendInterface.encodeFunctionData('multiSend', [
    encodedData
  ])

  const setUpData = safeInterface.encodeFunctionData('setup', [
    [ownerAddress],
    1,
    MULTISEND_ADDRESS,
    multiSendCallData,
    SAFE_4337_MODULE_ADDRESS,
    ethers.ZeroAddress,
    0,
    ethers.ZeroAddress
  ])

  const deploymentCode = ethers.solidityPacked(
    ['bytes', 'uint256'],
    [await safeFactoryInstance.proxyCreationCode(), singleton]
  )

  const salt = ethers.solidityPackedKeccak256(
    ['bytes32', 'uint256'],
    [
      ethers.keccak256(ethers.solidityPacked(['bytes'], [setUpData])),
      ethers.encodeBytes32String(saltNonce)
    ]
  )

  return ethers.getCreate2Address(
    factoryAddress,
    salt,
    ethers.keccak256(deploymentCode)
  )
}

/**
 * Encodes the function call to enable modules in the SafeModuleSetup contract.
 *
 * @param modules - An array of module addresses.
 * @returns The encoded function call data.
 */
function encodeSafeModuleSetupCall(modules: string[]): string {
  const safeModuleSetupInterface = new ethers.Interface(SetupModuleSetupAbi)
  return safeModuleSetupInterface.encodeFunctionData('enableModules', [modules])
}

/**
 * Encodes the necessary data for initializing a Safe contract and performing a user operation.
 * @param initializer - The SafeInitializer object containing the initialization parameters.
 * @param encodedUserOp - The encoded user operation data.
 * @returns The encoded data for initializing the Safe contract and performing the user operation.
 */
function getLaunchpadInitializeThenUserOpData(
  initializer: SafeInitializer,
  encodedUserOp: string
): string {
  const safeSignerLaunchpadInterface = new ethers.Interface(
    SafeSignerLaunchpadAbi
  )

  console.log({ initializer })

  const initializeThenUserOpData =
    safeSignerLaunchpadInterface.encodeFunctionData('initializeThenUserOp', [
      initializer.singleton,
      initializer.signerFactory,
      initializer.signerData,
      initializer.setupTo,
      initializer.setupData,
      initializer.fallbackHandler,
      encodedUserOp
    ])

  return initializeThenUserOpData
}

/**
 * Encodes the parameters of a user operation for execution on Safe4337Module.
 * @param to The address of the recipient of the operation.
 * @param value The amount of value to be transferred in the operation.
 * @param data The data payload of the operation.
 * @param operation The type of operation (0 for CALL, 1 for DELEGATECALL).
 * @returns The encoded data for the user operation.
 */
function getExecuteUserOpData(
  to: string,
  value: ethers.BigNumberish,
  data: string,
  operation: 0 | 1
): string {
  const abi = [
    'function executeUserOp(address to, uint256 value, bytes calldata data, uint8 operation) external',
    'function executeUserOpWithErrorString(address to, uint256 value, bytes calldata data, uint8 operation) external'
  ]
  const safe4337ModuleInterface = new ethers.Interface(abi)

  const executeUserOpData = safe4337ModuleInterface.encodeFunctionData(
    'executeUserOp',
    [to, value, data, operation]
  )

  return executeUserOpData
}

/**
 * Encodes the user operation data for validating a user operation.
 * @param userOp The user operation to be validated.
 * @param userOpHash The hash of the user operation.
 * @param missingAccountFunds The amount of missing account funds.
 * @returns The encoded data for validating the user operation.
 */
function getValidateUserOpData(
  userOp: UserOperation,
  userOpHash: string,
  missingAccountFunds: ethers.BigNumberish
): string {
  const safe4337ModuleInterface = new ethers.Interface(Safe4337ModuleAbi)

  const validateUserOpData = safe4337ModuleInterface.encodeFunctionData(
    'validateUserOp',
    [userOp, userOpHash, missingAccountFunds]
  )

  return validateUserOpData
}

const isDeployed = async (
  walletAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<boolean> => {
  try {
    const safe = getSafeContract(walletAddress, provider)
    const bytecode = await safe.getDeployedCode()

    if (!bytecode) {
      return false
    } else {
      return true
    }
  } catch (error) {
    return false
  }
}

const getOwners = async (
  walletAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<string[]> => {
  const safe = getSafeContract(walletAddress, provider)

  return await safe.getOwners()
}

const isSafeOwner = async (
  walletAddress: string,
  signerAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<boolean> => {
  const safe = getSafeContract(walletAddress, provider)
  if ((await isDeployed(walletAddress, provider)) === true) {
    return await safe.isOwner(signerAddress)
  } else {
    throw new WalletNotDeployedError()
  }
}

const isSigner = async (
  signerAddress: string,
  walletAddress: string,
  provider: ethers.JsonRpcProvider,
  API: API
): Promise<boolean> => {
  try {
    const owner = await isSafeOwner(walletAddress, signerAddress, provider)

    if (!owner) return false
  } catch {
    const predictedWalletAddress = await API.getWalletAddress(signerAddress)

    if (predictedWalletAddress !== walletAddress) return false
  }

  return true
}

export {
  encodeSafeModuleSetupCall,
  getEntrypointContract,
  getExecuteUserOpData,
  getInitHash,
  getLaunchpadInitializer,
  getLaunchpadInitializeThenUserOpData,
  getOwners,
  getSafe4337ModuleContract,
  getSafeAddress,
  getSafeAddressWithLaunchpad,
  getSafeDeploymentData,
  getSafeSignerLaunchpadContract,
  getValidateUserOpData,
  getWebAuthnSignerContract,
  getWebAuthnSignerFactoryContract,
  isDeployed,
  isSigner
}
