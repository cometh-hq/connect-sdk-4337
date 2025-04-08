import { BaseError } from "viem";

/**
 * Safe Smart Account Errors
 **/

export class MethodNotSupportedError extends BaseError {
    constructor() {
        super("Method not supported", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/",
        });
    }
}

/**
 * Session keys Errors
 **/

export class PermissionNotInstalledError extends BaseError {
    constructor() {
        super("Permission not installed for this wallet", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/resources/advanced-features/session-keys",
        });
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

export class ChainIdNotFoundError extends Error {
    constructor() {
        super("ChainId not found");
    }
}
