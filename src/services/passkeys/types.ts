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

type PasskeyCredentials = {
  publicKeyId: string
  publicKeyX: string
  publicKeyY: string
}

export type {
  Assertion,
  PasskeyCredential,
  PasskeyCredentialWithPubkeyCoordinates,
  PasskeyCredentials
}
