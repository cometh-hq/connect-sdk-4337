import { BaseError } from "viem";

/**
 * Safe Smart Account Errors
 **/

export class SafeNotDeployedError extends Error {
    constructor() {
        super("Safe not deployed");
    }
}

export class InvalidCallDataError extends Error {
    constructor() {
        super("Invalid callData for Safe Account");
    }
}

export class MethodNotSupportedError extends BaseError {
    constructor() {
        super("Method not supported", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/",
        });
    }
}

/**
 * Adaptor Errors
 **/

export class SignerNotOwnerError extends Error {
    constructor() {
        super("Signer found is not owner of the wallet");
    }
}

/**
 * Add New Device Errors
 **/

export class DeviceNotCompatibleWithPasskeysError extends Error {
    constructor() {
        super("Device not compatible with passkeys");
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
 * Signature Errors
 **/

export class InvalidSignatureEncodingError extends Error {
    constructor() {
        super("Invalid signature encoding");
    }
}

export class InvalidSignatureError extends Error {
    constructor() {
        super("Invalid signature");
    }
}

/**
 * Utils Errors
 **/

export class ChallengeNotFoundError extends Error {
    constructor() {
        super("Challenge not found in client data JSON");
    }
}

export class NoPrivateKeyFoundError extends Error {
    constructor() {
        super("No private key found");
    }
}