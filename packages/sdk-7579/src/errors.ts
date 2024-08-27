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

export class NoSignerFoundError extends Error {
    constructor() {
        super("No signer instance found");
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

export class PasskeyCreationError extends Error {
    constructor() {
        super("Error in the passkey creation");
    }
}

export class NoPasskeySignerFoundInDBError extends Error {
    constructor() {
        super("No passkey signer found in db for this walletAddress");
    }
}

export class NoPasskeySignerFoundInDeviceError extends Error {
    constructor() {
        super(
            "No signer was found on your device. You might need to add that domain as signer"
        );
    }
}

export class SignerNotOwnerError extends Error {
    constructor() {
        super("Signer found is not owner of the wallet");
    }
}

export class RetrieveWalletFromPasskeyError extends Error {
    constructor() {
        super("Unable to retrieve wallet address from passkeys");
    }
}

export class UnauthorizedMethodError extends Error {
    constructor(methodName: string) {
        super(`Not authorized method: ${methodName}`);
    }
}
