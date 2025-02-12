export type CallType = "call" | "delegatecall" | "batchcall";

export type ExecutionMode<callType extends CallType> = {
    type: callType;
    revertOnError?: boolean;
    selector?: `0x${string}`;
    context?: `0x${string}`;
};

/**
 * Wallet Errors
 **/

export class WalletDoesNotExistsError extends Error {
    constructor() {
        super("Provided wallet does not exists. Please verify wallet address");
    }
}

export class WalletNotConnectedError extends Error {
    constructor() {
        super("Wallet is not connected");
    }
}

export class WalletNotDeployedError extends Error {
    constructor() {
        super("Wallet is not deployed yet");
    }
}

export class WalletAlreadyImportedError extends Error {
    constructor() {
        super("Wallet is already imported");
    }
}

export class NoSignerFoundError extends Error {
    constructor() {
        super("No signer instance found");
    }
}

export class NetworkNotSupportedError extends Error {
    constructor() {
      super('Network is not supported')
    }
}

/**
 * Adaptor Errors
 **/

export class EoaFallbackDisableError extends Error {
    constructor() {
        super("ECC Passkeys are not compatible with your current device");
    }
}

export class NoFallbackSignerError extends Error {
    constructor() {
        super("No fallback signer found");
    }
}

export class FallbackAlreadySetError extends Error {
    constructor() {
        super("Fallback already set");
    }
}

export class SignerNotOwnerError extends Error {
    constructor() {
        super("Signer found is not owner of the wallet");
    }
}

export class UnauthorizedMethodError extends Error {
    constructor(methodName: string) {
        super(`Not authorized method: ${methodName}`);
    }
}

export class RelayedTransactionError extends Error {
    constructor() {
        super("Error during the relay of the transaction");
    }
}

/**
 * Safe Smart Account Errors
 **/

export class SafeNotDeployedError extends Error {
    constructor() {
        super("Safe not deployed");
    }
}

export class ImportOnUndeployedSafeError extends Error {
    constructor() {
        super("Import can only be done on deployed safe");
    }
}

export class RemoveOwnerOnUndeployedSafeError extends Error {
    constructor() {
        super("Can't remove owner on an undeployed safe");
    }
}

export class SmartAccountAddressNotFoundError extends Error {
    constructor() {
        super("No smart account address found");
    }
}

export class MethodNotSupportedError extends Error {
    constructor() {
      super("Method not supported")
    }
}

export class BatchCallModeNotSupportedError extends Error {
    constructor(mode: ExecutionMode<CallType>) {
        super(`Mode ${JSON.stringify(mode)} is not supported for batchcall calldata`);
    }
}

export class NoCallsToEncodeError extends Error {
    constructor() {
        super("No calls to encode");
    }
}

export class InvalidCallDataError extends Error {
    constructor() {
        super("Invalid callData for Safe Account");
    }
}

export class SafeVersionNotSupportedError extends Error {
    constructor(supportedVersion: string, currentVersion: string) {
        super(`Safe is not version ${supportedVersion}. Current version: ${currentVersion}`);
    }
}

export class OwnerToRemoveIsNotSafeOwnerError extends Error {
    constructor(ownerToRemove: string) {
        super(`${ownerToRemove} is not a safe owner`);
    }
}

export class MigrationContractAddressNotAvailableError extends Error {
    constructor() {
        super("Migration contract address not available for this network");
    }
}

/**
 * Recovery Errors
 **/

export class NoRecoveryRequestFoundError extends Error {
    constructor() {
        super("No recovery request found");
    }
}

export class AddressIsNotAGuardianError extends Error {
    constructor() {
        super("Address is not a guardian");
    }
}

export class DelayModuleNotEnabledError extends Error {
    constructor() {
        super("Delay module not enabled");
    }
}

export class DelayModuleAlreadySetUpError extends Error {
    constructor() {
        super("Delay module already set up");
    }
}

export class GuardianAlreadyEnabledError extends Error {
    constructor() {
        super("Guardian already enabled");
    }
}

export class PreviousModuleNotFoundError extends Error {
    constructor() {
        super("Previous module not found");
    }
}

export class RecoveryNotActiveError extends Error {
    constructor() {
        super("Recovery not active");
    }
}

export class RecoveryNotSetUpError extends Error {
    constructor() {
        super("Recovery has not been setup");
    }
}

export class RecoveryAlreadySetUpError extends Error {
    constructor() {
        super("Recovery already setup");
    }
}

/**
 * Signature Errors
 **/

export class InvalidSignatureError extends Error {
    constructor() {
        super("Invalid signature");
    }
}

export class InvalidSignerDataError extends Error {
    constructor() {
        super("Invalid signer data");
    }
}

export class InvalidSignatureEncodingError extends Error {
    constructor() {
        super("Invalid signature encoding");
    }
}

export class EoaSignerRequiredError extends Error {
    constructor() {
        super("eoaSigner is required");
    }
}

/**
 * Add New Device Errors
 **/

export class FailedToSerializeUrlError extends Error {
    constructor(error: Error) {
        super(`Failed to serialize url: ${error}`);
    }
}

export class FailedToGenerateQRCodeError extends Error {
    constructor(error: Error) {
        super(`Failed to generate QR Code: ${error}`);
    }
}

export class DeviceNotCompatibleWithPasskeysError extends Error {
    constructor() {
        super("Device not compatible with passkeys");
    }
}

export class DeviceNotCompatibleWithSECKP256r1PasskeysError extends Error {
    constructor() {
        super("Device not compatible with SECKP256r1 passkeys");
    }
}

/**
 * Passkeys Errors
 **/

export class PasskeyCreationError extends Error {
    constructor() {
        super("Error in the passkey creation");
    }
}

export class FailedToGeneratePasskeyError extends Error {
    constructor() {
        super("Failed to generate passkey. Received null as a credential");
    }
}

export class NoPasskeySignerFoundInDBError extends Error {
    constructor() {
        super("No passkey signer found in db for this walletAddress");
    }
}

export class NoPasskeySignerFoundForGivenChain extends Error {
    constructor() {
        super("No passkey signer found in db for this walletAddress and chain");
    }
}

export class NoPasskeySignerFoundInDeviceError extends Error {
    constructor() {
        super(
            "No signer was found on your device. You might need to add that domain as signer"
        );
    }
}

export class RetrieveWalletFromPasskeyError extends Error {
    constructor() {
        super("Unable to retrieve wallet address from passkeys");
    }
}

export class PasskeySignatureFailedError extends Error {
    constructor() {
        super("Passkey signature failed");
    }
}

export class PasskeySignerNotValidError extends Error {
    constructor() {
        super("Passkey signer not valid");
    }
}

/**
 * Session keys Errors
 **/

export class PermissionNotInstalledError extends Error {
    constructor() {
        super("Permission not installed for this wallet");
    }
}


/**
 * Transactions Errors
 **/

export class MissingToAddressError extends Error {
    constructor() {
        super("Missing to address");
    }
}


/**
 * Utils Errors
 **/

export class APINotFoundError extends Error {
    constructor() {
        super("No API found");
    }
}

export class FetchingProjectParamsError extends Error {
    constructor() {
        super("Error fetching project params");
    }
}

export class ChainIdNotFoundError extends Error {
    constructor() {
        super("ChainId not found");
    }
}

export class NoPrivateKeyFoundError extends Error {
    constructor() {
        super("No private key found");
    }
}

export class ChallengeNotFoundError extends Error {
    constructor() {
        super("Challenge not found in client data JSON");
    }
}