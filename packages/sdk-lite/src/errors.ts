import { BaseError } from "viem";

export type CallType = "call" | "delegatecall" | "batchcall";

export type ExecutionMode<callType extends CallType> = {
    type: callType;
    revertOnError?: boolean;
    selector?: `0x${string}`;
    context?: `0x${string}`;
};


/**
 * Adaptor Errors
 **/

export class FallbackAlreadySetError extends Error {
    constructor() {
        super("Fallback already set");
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

export class SmartAccountAddressNotFoundError extends Error {
    constructor() {
        super("No smart account address found");
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

export class BatchCallModeNotSupportedError extends Error {
    constructor(mode: ExecutionMode<CallType>) {
        super(
            `Mode ${JSON.stringify(
                mode
            )} is not supported for batchcall calldata`
        );
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


/**
 * Signature Errors
 **/

export class InvalidSignatureError extends Error {
    constructor() {
        super("Invalid signature");
    }
}


/**
 * Transactions Errors
 **/

export class MissingToAddressError extends BaseError {
    constructor() {
        super("Missing to address", {
            docsBaseUrl: "https://docs.cometh.io/connect-4337",
            docsPath: "/sdk-features/send-transactions",
        });
    }
}
