import { Signer } from '@ethersproject/abstract-signer'
import { ethers } from 'ethers'

import { sign } from '../../services/passkeys/passkeyService'
import { parseHex } from '../../utils/utils'

export class PasskeySigner extends Signer {
  private publicKeyId: string
  private publicKeyX: string
  private publicKeyY: string
  private signerAddress: string

  constructor(
    publicKeyId: string,
    publicKeyX: string,
    publicKeyY: string,
    signerAddress: string
  ) {
    super()
    this.publicKeyId = publicKeyId
    this.publicKeyX = publicKeyX
    this.publicKeyY = publicKeyY
    this.signerAddress = signerAddress
  }

  async getAddress(): Promise<string> {
    return this.signerAddress
  }

  getPasskeyCredentials(): {
    publicKeyId: string
    publicKeyX: string
    publicKeyY: string
  } {
    return {
      publicKeyId: this.publicKeyId,
      publicKeyX: this.publicKeyX,
      publicKeyY: this.publicKeyY
    }
  }

  async _signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, Array<ethers.TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    const challenge = ethers.TypedDataEncoder.hash(domain, types, value)

    const publicKeyCredential: PublicKeyCredentialDescriptor[] = [
      {
        id: parseHex(this.publicKeyId),
        type: 'public-key'
      }
    ]

    const { signature } = await sign(challenge, publicKeyCredential)

    return signature
  }

  async signTransaction(): Promise<string> {
    throw new Error('Not authorized method: signTransaction')
  }

  async signMessage(): Promise<string> {
    throw new Error('Not authorized method: signMessage')
  }

  connect(): Signer {
    throw new Error('Not authorized method: connect')
  }
}
