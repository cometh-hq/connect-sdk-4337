import { ENTRYPOINT_ADDRESS_V07 } from "./constants";
import {
    type ComethSafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "./core/accounts/safe/createSafeSmartAccount";

import type { SafeSigner } from "./core/accounts/safe/safeSigner/types";
import {
    type ComethSmartAccountClient,
    type SmartAccountClient,
    createSmartAccountClient,
} from "./core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import { providerToSmartAccountSigner } from "./core/signers/utils";
import {
    BatchCallModeNotSupportedError,
    CannotSignForAddressError,
    ExpiryInPastError,
    ExpiryRequiredError,
    FallbackAlreadySetError,
    InvalidAccountAddressError,
    InvalidCallDataError,
    InvalidParamsError,
    InvalidSignatureError,
    InvalidSignerTypeError,
    InvalidSmartAccountClientError,
    MethodNotSupportedError,
    MissingToAddressError,
    NoCallsToEncodeError,
    OwnerToRemoveIsNotSafeOwnerError,
    RemoveOwnerOnUndeployedSafeError,
    SafeNotDeployedError,
    SmartAccountAddressNotFoundError,
    UnsupportedPermissionTypeError,
    UnsupportedPolicyError,
    WalletNotConnectedError,
} from "./errors";

export {
    createSafeSmartAccount,
    createSmartAccountClient,
    createComethPaymasterClient,
    providerToSmartAccountSigner,
    ENTRYPOINT_ADDRESS_V07,
    FallbackAlreadySetError,
    SafeNotDeployedError,
    SmartAccountAddressNotFoundError,
    MethodNotSupportedError,
    BatchCallModeNotSupportedError,
    NoCallsToEncodeError,
    InvalidCallDataError,
    InvalidSignatureError,
    MissingToAddressError,
    OwnerToRemoveIsNotSafeOwnerError,
    RemoveOwnerOnUndeployedSafeError,
    CannotSignForAddressError,
    InvalidAccountAddressError,
    InvalidParamsError,
    WalletNotConnectedError,
    InvalidSmartAccountClientError,
    InvalidSignerTypeError,
    ExpiryInPastError,
    ExpiryRequiredError,
    UnsupportedPolicyError,
    UnsupportedPermissionTypeError,
};

export type {
    SmartAccountClient,
    ComethSafeSmartAccount,
    ComethSmartAccountClient,
    createSafeSmartAccountParameters,
    SafeSigner,
};
