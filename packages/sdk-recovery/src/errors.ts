import { BaseError } from "viem";

/**
 * Recovery Errors
 **/

export class NoRecoveryRequestFoundError extends BaseError {
    constructor() {
        super("No recovery request found", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class AddressIsNotAGuardianError extends BaseError {
    constructor() {
        super("Address is not a guardian", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class DelayModuleNotEnabledError extends BaseError {
    constructor() {
        super("Delay module not enabled", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class DelayModuleAlreadySetUpError extends BaseError {
    constructor() {
        super("Delay module already set up", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class GuardianAlreadyEnabledError extends BaseError {
    constructor() {
        super("Guardian already enabled", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class PreviousModuleNotFoundError extends BaseError {
    constructor() {
        super("Previous module not found", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class RecoveryNotActiveError extends BaseError {
    constructor() {
        super("Recovery not active", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class RecoveryNotSetUpError extends BaseError {
    constructor() {
        super("Recovery has not been setup", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
    }
}

export class RecoveryAlreadySetUpError extends BaseError {
    constructor() {
        super("Recovery already setup", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/social-recovery",
        });
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

export class MissingSignerAddressError extends Error {
    constructor() {
        super("Missing signer address");
    }
}
