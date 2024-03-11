/**
 * Wallet Errors
 **/

export class WalletDoesNotExistsError extends Error {
  constructor() {
    super('Provided wallet does not exists. Please verify wallet address')
  }
}

export class WalletNotConnectedError extends Error {
  constructor() {
    super('Wallet is not connected')
  }
}

export class WalletNotDeployedError extends Error {
  constructor() {
    super('Wallet is not deployed yet')
  }
}

export class NetworkNotSupportedError extends Error {
  constructor() {
    super('This network is not supported')
  }
}

export class ProjectParamsError extends Error {
  constructor() {
    super('Project params are null')
  }
}

export class NoSignerFoundError extends Error {
  constructor() {
    super('No signer instance found')
  }
}

export class NoAdapterFoundError extends Error {
  constructor() {
    super('No EOA adapter found')
  }
}

/**
 * Adaptor Errors
 **/

export class EoaFallbackDisableError extends Error {
  constructor() {
    super('ECC Passkeys are not compatible with your current device')
  }
}

export class NoFallbackSignerError extends Error {
  constructor() {
    super('No fallback signer found')
  }
}

export class PasskeyCreationError extends Error {
  constructor() {
    super('Error in the passkey creation')
  }
}

export class NoPasskeySignerFoundInDBError extends Error {
  constructor() {
    super('No passkey signer found in db for this walletAddress')
  }
}

export class NoPasskeySignerFoundInDeviceError extends Error {
  constructor() {
    super(
      'No signer was found on your device. You might need to add that domain as signer'
    )
  }
}

export class SignerNotOwnerError extends Error {
  constructor() {
    super('Signer found is not owner of the wallet')
  }
}

export class RetrieveWalletFromPasskeyError extends Error {
  constructor() {
    super('Unable to retrieve wallet address from passkeys')
  }
}

export class UnauthorizedMethodError extends Error {
  constructor(methodName: string) {
    super(`Not authorized method: ${methodName}`)
  }
}

/**
 * Provider Errors
 **/

export class NoProviderFoundError extends Error {
  constructor() {
    super('Missing provider')
  }
}

/**
 * Transaction Errors
 **/

export class TransactionDeniedError extends Error {
  constructor() {
    super('Transaction denied')
  }
}

export class EmptyBatchTransactionError extends Error {
  constructor() {
    super('Empty array provided, no transaction to send')
  }
}

export class EstimateGasError extends Error {
  constructor() {
    super('Impossible to determine gas...')
  }
}

export class BalanceError extends Error {
  constructor() {
    super('Not enough balance to send this value and pay for gas')
  }
}

export class RelayedTransactionError extends Error {
  constructor() {
    super('Error during the relay of the transaction')
  }
}

/**
 * Recovery Errors
 **/

export class NewRecoveryNotSupportedError extends Error {
  constructor() {
    super(
      'This Recovery Request type is not supported with this method, please reach out'
    )
  }
}

export class NoRecoveryRequestFoundError extends Error {
  constructor() {
    super('No recovery request found')
  }
}

export class CancelRecoveryError extends Error {
  constructor() {
    super('Failed to cancel recovery request')
  }
}

export class GetRecoveryError extends Error {
  constructor() {
    super('Failed to get recovery request')
  }
}

/**
 * Safe specific Errors
 **/

export class SafeVersionError extends Error {
  constructor() {
    super('Safe version should be 1.3.0')
  }
}

export class AddressAlreadyOwnerError extends Error {
  constructor() {
    super('Address is already owner of the smart wallet')
  }
}

export class AddressNotOwnerError extends Error {
  constructor() {
    super('Address is not an owner of the wallet')
  }
}

/**
 * Utils Errors
 **/

export class WrongSignedMessageError extends Error {
  constructor() {
    super(
      'Wrong message signed. Please use the standard message for safe import'
    )
  }
}

export class InvalidAddressFormatError extends Error {
  constructor() {
    super('Invalid address format')
  }
}

export class TypedDataNotSupportedError extends Error {
  constructor() {
    super('Types data not supported')
  }
}
