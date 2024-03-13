import { ethers } from 'ethers'

import {
  WEBAUTHN_SIGNER_FACTORY_ADDRESS,
  WEBAUTHN_VERIFIER_ADDRESS
} from '../../config'
import { BLOCK_EVENT_GAP, WebauthnSignerBytecode } from '../../constants'
import { hexArrayStr } from '../../utils'
import {
  extractClientDataFields,
  extractSignature,
  getPasskeyCreationRpId
} from '../../utils/passkeys'
import { parseHex } from '../../utils/utils'
import {
  NoPasskeySignerFoundInDBError,
  NoPasskeySignerFoundInDeviceError,
  RetrieveWalletFromPasskeyError,
  SignerNotOwnerError
} from '../../wallet/errors'
import { DeviceData, webAuthnOptions, WebAuthnSigner } from '../../wallet/types'
import { API } from '../API'
import deviceService from '../deviceService'
import { getWebAuthnSignerFactoryContract, isSigner } from '../safe/safeService'

type Assertion = {
  rawId: ArrayBuffer
  response: AuthenticatorAssertionResponse
}

type PasskeyCredential = {
  id: 'string'
  rawId: ArrayBuffer
  response: {
    clientDataJSON: ArrayBuffer
    attestationObject: ArrayBuffer
    getPublicKey(): ArrayBuffer
    getPublicKeyAlgorithm(): any
  }
  type: 'public-key'
}

type PasskeyCredentialWithPubkeyCoordinates = PasskeyCredential & {
  pubkeyCoordinates: {
    x: string
    y: string
  }
}

/**
 * Calculates the signer address from the given public key coordinates.
 * @param x The x-coordinate of the public key.
 * @param y The y-coordinate of the public key.
 * @returns The signer address.
 */
const getSignerAddressFromPubkeyCoords = (x: string, y: string): string => {
  const deploymentCode = ethers.solidityPacked(
    ['bytes', 'uint256', 'uint256', 'uint256'],
    [WebauthnSignerBytecode, x, y, WEBAUTHN_VERIFIER_ADDRESS]
  )
  const salt = ethers.ZeroHash
  return ethers.getCreate2Address(
    WEBAUTHN_SIGNER_FACTORY_ADDRESS,
    salt,
    ethers.keccak256(deploymentCode)
  )
}

const createPasskey = async (
  webAuthnOptions: webAuthnOptions,
  passKeyName?: string
): Promise<{
  publicKeyX: string
  publicKeyY: string
  publicKeyId: string
  publicKeyAlgorithm: number
}> => {
  try {
    const name = passKeyName || 'Cometh Connect'
    const authenticatorSelection = webAuthnOptions?.authenticatorSelection
    const extensions = webAuthnOptions?.extensions

    const passkeyCredential = (await navigator.credentials.create({
      publicKey: {
        rp: getPasskeyCreationRpId(),
        user: {
          id: crypto.getRandomValues(new Uint8Array(32)),
          name,
          displayName: name
        },
        attestation: 'none',
        authenticatorSelection,
        timeout: 30000,
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        extensions
      }
    })) as PasskeyCredential

    if (!passkeyCredential) {
      throw new Error(
        'Failed to generate passkey. Received null as a credential'
      )
    }

    const publicKeyAlgorithm =
      passkeyCredential.response.getPublicKeyAlgorithm()

    // Import the public key to later export it to get the XY coordinates
    const key = await crypto.subtle.importKey(
      'spki',
      passkeyCredential.response.getPublicKey(),
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
        hash: { name: 'SHA-256' }
      },
      true, // boolean that marks the key as an exportable one
      ['verify']
    )

    // Export the public key in JWK format and extract XY coordinates
    const exportedKeyWithXYCoordinates = await crypto.subtle.exportKey(
      'jwk',
      key
    )
    if (!exportedKeyWithXYCoordinates.x || !exportedKeyWithXYCoordinates.y) {
      throw new Error('Failed to retrieve x and y coordinates')
    }

    const publicKeyX = `0x${Buffer.from(
      exportedKeyWithXYCoordinates.x,
      'base64'
    ).toString('hex')}`
    const publicKeyY = `0x${Buffer.from(
      exportedKeyWithXYCoordinates.y,
      'base64'
    ).toString('hex')}`

    const publicKeyId = hexArrayStr(passkeyCredential.rawId)

    // Create a PasskeyCredentialWithPubkeyCoordinates object
    const passkeyWithCoordinates: PasskeyCredentialWithPubkeyCoordinates =
      Object.assign(passkeyCredential, {
        pubkeyCoordinates: {
          x: publicKeyX,
          y: publicKeyY
        }
      })

    return {
      publicKeyX,
      publicKeyY,
      publicKeyId,
      publicKeyAlgorithm
    }
  } catch {
    throw new Error('Error in the passkey creation')
  }
}

const sign = async (
  challenge: string,
  publicKeyCredential?: PublicKeyCredentialDescriptor[]
): Promise<{ signature: string; publicKeyId: string }> => {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: ethers.getBytes(challenge),
      allowCredentials: publicKeyCredential || [],
      userVerification: 'required',
      timeout: 30000
    }
  })) as Assertion | null

  if (!assertion) throw new Error('Passkey signature failed')

  const signature = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes', 'bytes', 'uint256[2]'],
    [
      new Uint8Array(assertion.response.authenticatorData),
      extractClientDataFields(assertion.response),
      extractSignature(assertion.response)
    ]
  )

  const publicKeyId = hexArrayStr(assertion.rawId)

  return { signature, publicKeyId }
}

const waitPasskeySignerDeployment = async (
  safeWebauthnSignerFactoryAddress: string,
  publicKey_X: string,
  publicKey_Y: string,
  provider: ethers.JsonRpcProvider
): Promise<string> => {
  const safeWebauthnSignerFactory = getWebAuthnSignerFactoryContract(
    safeWebauthnSignerFactoryAddress,
    provider
  )

  let signerDeploymentEvent: any = []

  while (signerDeploymentEvent.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    signerDeploymentEvent = await safeWebauthnSignerFactory.queryFilter(
      safeWebauthnSignerFactory.filters.NewSignerCreated(
        publicKey_X,
        publicKey_Y
      ),
      BLOCK_EVENT_GAP
    )
  }

  return signerDeploymentEvent[0].args.signer
}

const signWithPasskey = async (
  challenge: string,
  webAuthnSigners?: WebAuthnSigner[]
): Promise<{
  signature: string
  publicKeyId: string
}> => {
  let publicKeyCredentials: PublicKeyCredentialDescriptor[] | undefined

  if (webAuthnSigners) {
    publicKeyCredentials = webAuthnSigners.map((webAuthnSigner) => {
      return {
        id: parseHex(webAuthnSigner.publicKeyId),
        type: 'public-key'
      }
    })
  }

  const { signature, publicKeyId } = await sign(
    ethers.keccak256(ethers.hashMessage(challenge)),
    publicKeyCredentials
  )

  return { signature, publicKeyId }
}

const retrieveWalletAddressFromSigner = async (API: API): Promise<string> => {
  let publicKeyId: string

  try {
    ;({ publicKeyId } = await signWithPasskey('Retrieve Wallet'))
  } catch {
    throw new RetrieveWalletFromPasskeyError()
  }

  const signingWebAuthnSigner = await API.getPasskeySignerByPublicKeyId(
    publicKeyId
  )
  if (!signingWebAuthnSigner) throw new NoPasskeySignerFoundInDBError()

  const { walletAddress, signerAddress } = signingWebAuthnSigner

  setPasskeyInStorage(walletAddress, publicKeyId, signerAddress)

  return walletAddress
}

const setPasskeyInStorage = (
  walletAddress: string,
  publicKeyId: string,
  signerAddress: string
): void => {
  const localStoragePasskey = JSON.stringify({
    publicKeyId,
    signerAddress
  })
  window.localStorage.setItem(
    `cometh-connect-${walletAddress}`,
    localStoragePasskey
  )
}

const getPasskeyInStorage = (walletAddress: string): string | null => {
  return window.localStorage.getItem(`cometh-connect-${walletAddress}`)
}

const getSignerFromCredentials = async ({
  API,
  publicKeyX,
  publicKeyY,
  walletAddress
}: {
  API: API
  publicKeyX: string
  publicKeyY: string
  walletAddress?: string
}): Promise<{
  deviceData: DeviceData
  signerAddress: string
  walletAddress: string
}> => {
  const deviceData = deviceService.getDeviceData()

  const signerAddress = getSignerAddressFromPubkeyCoords(publicKeyX, publicKeyY)

  walletAddress = walletAddress || (await API.getWalletAddress(signerAddress))

  return {
    deviceData,
    signerAddress,
    walletAddress
  }
}

const getSigner = async ({
  API,
  walletAddress,
  provider
}: {
  API: API
  walletAddress: string
  provider: ethers.JsonRpcProvider
}): Promise<{
  publicKeyId: string
  publicKeyX: string
  publicKeyY: string
  signerAddress: string
}> => {
  const passkeySigners = await API.getPasskeySignersByWalletAddress(
    walletAddress
  )

  if (passkeySigners.length === 0) throw new NoPasskeySignerFoundInDBError()

  /* Retrieve potentiel WebAuthn credentials in storage */
  const localStoragePasskey = getPasskeyInStorage(walletAddress)

  if (localStoragePasskey) {
    /* Check if storage WebAuthn credentials exists in db */
    const registeredPasskeySigner = await API.getPasskeySignerByPublicKeyId(
      JSON.parse(localStoragePasskey).publicKeyId
    )

    const isOwner = await isSigner(
      registeredPasskeySigner.signerAddress,
      walletAddress,
      provider,
      API
    )

    if (!isOwner || !registeredPasskeySigner) throw new SignerNotOwnerError()

    return {
      publicKeyId: registeredPasskeySigner.publicKeyId,
      publicKeyX: registeredPasskeySigner.publicKeyX,
      publicKeyY: registeredPasskeySigner.publicKeyY,
      signerAddress: registeredPasskeySigner.signerAddress
    }
  }

  /* If no local storage or no match in db, Call Webauthn API to get current signer */
  let signatureParams
  try {
    signatureParams = await signWithPasskey('SDK Connection', passkeySigners)
  } catch {
    throw new NoPasskeySignerFoundInDeviceError()
  }

  const signingWebAuthnSigner = await API.getPasskeySignerByPublicKeyId(
    signatureParams.publicKeyId
  )

  const isOwner = await isSigner(
    signingWebAuthnSigner.signerAddress,
    walletAddress,
    provider,
    API
  )

  if (!isOwner) throw new SignerNotOwnerError()

  /* Store WebAuthn credentials in storage */
  setPasskeyInStorage(
    walletAddress,
    signatureParams.publicKeyId,
    signatureParams.signerAddress
  )

  return {
    publicKeyId: signingWebAuthnSigner.publicKeyId,
    publicKeyX: signingWebAuthnSigner.publicKeyX,
    publicKeyY: signingWebAuthnSigner.publicKeyY,
    signerAddress: signingWebAuthnSigner.signerAddress
  }
}

export {
  createPasskey,
  getPasskeyInStorage,
  getSigner,
  getSignerAddressFromPubkeyCoords,
  getSignerFromCredentials,
  retrieveWalletAddressFromSigner,
  setPasskeyInStorage,
  sign,
  signWithPasskey,
  waitPasskeySignerDeployment
}
