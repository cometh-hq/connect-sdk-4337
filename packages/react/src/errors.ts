/**
 * Provider Errors
 **/

export class NotWithinConnectProviderError extends Error {
    constructor(hookName: string) {
        super(`${hookName} must be used within a ConnectProvider`);
    }
}

export class NotWithinSmartAccountProviderError extends Error {
    constructor() {
        super("Hooks must be used within a SmartAccountProvider");
    }
}


/**
 * Smart Account Errors
 **/

export class SmartAccountNotFoundError extends Error {
    constructor() {
        super("No smart account found");
    }
}

export class SignerNotFoundError extends Error {
    constructor() {
        super("No signer found");
    }
}

export class ApiKeyNotFoundError extends Error {
    constructor() {
        super("No apikey found");
    }
} 

export class BundlerUrlNotFoundError extends Error {
    constructor() {
        super("Bundler url not found");
    }
}


/**
 * Hooks Errors
 **/

export class UseDisconnectError extends Error {
    constructor() {
        super("An error occurred during disconnection");
    }
}

export class UseSwitchChainError extends Error {
    constructor() {
        super("An error occurred while switching chain");
    }
}

export class NoCurrentConfigurationError extends Error {
    constructor() {
        super("No current configuration found");
    }
}