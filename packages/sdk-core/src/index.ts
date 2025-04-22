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
<<<<<<< HEAD
<<<<<<< HEAD
    CannotSignForAddressError,
    FallbackAlreadySetError,
    InvalidAccountAddressError,
    InvalidCallDataError,
    InvalidParamsError,
    InvalidSignatureError,
    InvalidSmartAccountClientError,
    MethodNotSupportedError,
    MissingToAddressError,
    NoCallsToEncodeError,
    OwnerToRemoveIsNotSafeOwnerError,
    RemoveOwnerOnUndeployedSafeError,
    SafeNotDeployedError,
    SmartAccountAddressNotFoundError,
    WalletNotConnectedError,
=======
=======
    CannotSignForAddressError,
>>>>>>> 8f70c31 (Sdk core/new features (#77))
    FallbackAlreadySetError,
    InvalidAccountAddressError,
    InvalidCallDataError,
    InvalidParamsError,
    InvalidSignatureError,
    InvalidSmartAccountClientError,
    MethodNotSupportedError,
    MissingToAddressError,
    NoCallsToEncodeError,
    OwnerToRemoveIsNotSafeOwnerError,
    RemoveOwnerOnUndeployedSafeError,
    SafeNotDeployedError,
    SmartAccountAddressNotFoundError,
<<<<<<< HEAD
>>>>>>> bac4782 (feat/sdk-lite (#75))
=======
    WalletNotConnectedError,
>>>>>>> 8f70c31 (Sdk core/new features (#77))
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 8f70c31 (Sdk core/new features (#77))
    OwnerToRemoveIsNotSafeOwnerError,
    RemoveOwnerOnUndeployedSafeError,
    CannotSignForAddressError,
    InvalidAccountAddressError,
    InvalidParamsError,
    WalletNotConnectedError,
    InvalidSmartAccountClientError,
<<<<<<< HEAD
=======
>>>>>>> bac4782 (feat/sdk-lite (#75))
=======
>>>>>>> 8f70c31 (Sdk core/new features (#77))
};

export type {
    SmartAccountClient,
    ComethSafeSmartAccount,
    ComethSmartAccountClient,
    createSafeSmartAccountParameters,
    SafeSigner,
};
