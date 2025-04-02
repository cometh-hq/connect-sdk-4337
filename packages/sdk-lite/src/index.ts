import { erc7579Actions } from "permissionless/actions/erc7579";
import { ENTRYPOINT_ADDRESS_V07, customChains } from "./constants";

import {
    type ComethSafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "./core/accounts/safe/createSafeSmartAccount";
import {
    type QRCodeOptions,
    generateQRCodeUrl,
    serializeUrlWithSignerPayload,
} from "./core/actions/accounts/addNewDevice";
import type { EnrichedOwner } from "./core/actions/accounts/safe/owners/safeOwnerActions";

import type { SafeSigner } from "./core/accounts/safe/safeSigner/types";
import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "./core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import { smartSessionActions } from "./core/modules/sessionKey/decorators";
import { toSmartSessionsSigner } from "./core/modules/sessionKey/toSmartSessionsSigner";
import type { RecoveryParamsResponse } from "./core/services/delayModuleService";
import type { Signer } from "./core/types";

import type { GrantPermissionParameters } from "./core/modules/sessionKey/decorators/grantPermission";

import { SmartSessionMode } from "@rhinestone/module-sdk";
import type { UsePermissionParameters } from "./core/modules/sessionKey/decorators/usePermission";
import type {
    CreateSessionDataParams,
    GrantPermissionResponse,
} from "./core/modules/sessionKey/types";
import { providerToSmartAccountSigner } from "./core/signers/utils";
import {
    AddressIsNotAGuardianError,
    BatchCallModeNotSupportedError,
    CannotSignForAddressError,
    ChainIdNotFoundError,
    ChallengeNotFoundError,
    DelayModuleAlreadySetUpError,
    DelayModuleNotEnabledError,
    EoaSignerRequiredError,
    ExpiryInPastError,
    ExpiryRequiredError,
    FailedToGenerateQRCodeError,
    FailedToSerializeUrlError,
    FallbackAlreadySetError,
    GuardianAlreadyEnabledError,
    ImportOnUndeployedSafeError,
    InvalidAccountAddressError,
    InvalidCallDataError,
    InvalidParamsError,
    InvalidSignatureEncodingError,
    InvalidSignatureError,
    InvalidSignerDataError,
    InvalidSignerTypeError,
    InvalidSmartAccountClientError,
    MethodNotSupportedError,
    MigrationContractAddressNotAvailableError,
    MissingToAddressError,
    NoCallsToEncodeError,
    NoFallbackSignerError,
    NoPrivateKeyFoundError,
    NoRecoveryRequestFoundError,
    NoSignerFoundError,
    OwnerToRemoveIsNotSafeOwnerError,
    PermissionNotInstalledError,
    PreviousModuleNotFoundError,
    RecoveryAlreadySetUpError,
    RecoveryNotActiveError,
    RecoveryNotSetUpError,
    RelayedTransactionError,
    RemoveOwnerOnUndeployedSafeError,
    SafeNotDeployedError,
    SafeVersionNotSupportedError,
    SignerNotOwnerError,
    SmartAccountAddressNotFoundError,
    UnauthorizedMethodError,
    UnsupportedPermissionTypeError,
    UnsupportedPolicyError,
    WalletAlreadyImportedError,
    WalletDoesNotExistsError,
    WalletNotConnectedError,
    WalletNotDeployedError,
} from "./errors";

import { EIP1193Provider } from "./core/clients/accounts/safe/1193Provider";

export {
    createSafeSmartAccount,
    createSmartAccountClient,
    serializeUrlWithSignerPayload,
    generateQRCodeUrl,
    createComethPaymasterClient,
    erc7579Actions,
    smartSessionActions,
    toSmartSessionsSigner,
    providerToSmartAccountSigner,
    ENTRYPOINT_ADDRESS_V07,
    customChains,
    SmartSessionMode,
    EIP1193Provider,
    WalletDoesNotExistsError,
    WalletNotConnectedError,
    WalletNotDeployedError,
    WalletAlreadyImportedError,
    NoSignerFoundError,
    NoFallbackSignerError,
    FallbackAlreadySetError,
    SignerNotOwnerError,
    UnauthorizedMethodError,
    RelayedTransactionError,
    SafeNotDeployedError,
    ImportOnUndeployedSafeError,
    RemoveOwnerOnUndeployedSafeError,
    SmartAccountAddressNotFoundError,
    MethodNotSupportedError,
    BatchCallModeNotSupportedError,
    NoCallsToEncodeError,
    InvalidCallDataError,
    SafeVersionNotSupportedError,
    OwnerToRemoveIsNotSafeOwnerError,
    MigrationContractAddressNotAvailableError,
    NoRecoveryRequestFoundError,
    AddressIsNotAGuardianError,
    DelayModuleNotEnabledError,
    DelayModuleAlreadySetUpError,
    GuardianAlreadyEnabledError,
    PreviousModuleNotFoundError,
    RecoveryNotActiveError,
    RecoveryNotSetUpError,
    RecoveryAlreadySetUpError,
    InvalidSignatureError,
    InvalidSignerDataError,
    InvalidSignatureEncodingError,
    EoaSignerRequiredError,
    FailedToSerializeUrlError,
    FailedToGenerateQRCodeError,
    PermissionNotInstalledError,
    MissingToAddressError,
    ChainIdNotFoundError,
    NoPrivateKeyFoundError,
    ChallengeNotFoundError,
    InvalidSmartAccountClientError,
    InvalidAccountAddressError,
    CannotSignForAddressError,
    InvalidSignerTypeError,
    ExpiryRequiredError,
    ExpiryInPastError,
    UnsupportedPolicyError,
    UnsupportedPermissionTypeError,
    InvalidParamsError,
};

export type {
    ComethSafeSmartAccount,
    ComethSmartAccountClient,
    createSafeSmartAccountParameters,
    Signer,
    EnrichedOwner,
    QRCodeOptions,
    RecoveryParamsResponse,
    CreateSessionDataParams,
    SafeSigner,
    GrantPermissionParameters,
    GrantPermissionResponse,
    UsePermissionParameters,
};
