import { erc7579Actions } from "permissionless/actions/erc7579";
import { ENTRYPOINT_ADDRESS_V07, customChains } from "./constants";

import {
    type ComethSafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "./core/accounts/safe/createSafeSmartAccount";
import {
    type QRCodeOptions,
    createNewSigner,
    createNewSignerWithAccountAddress,
    generateQRCodeUrl,
    serializeUrlWithSignerPayload,
} from "./core/actions/accounts/addNewDevice";
import {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
} from "./core/actions/accounts/retrieveAccountAddressFromPasskey";
import { importSafeActions } from "./core/actions/accounts/safe/importSafe/importSafeActions";
import type { EnrichedOwner } from "./core/actions/accounts/safe/owners/safeOwnerActions";
import type { CancelRecoveryRequestParams } from "./core/actions/accounts/safe/recovery/cancelRecoveryRequest";
import type { GetRecoveryRequestParams } from "./core/actions/accounts/safe/recovery/getRecoveryRequest";
import type {
    IsRecoveryActiveParams,
    IsRecoveryActiveReturnType,
} from "./core/actions/accounts/safe/recovery/isRecoveryActive";

import type { SafeSigner } from "./core/accounts/safe/safeSigner/types";
import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "./core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import { smartSessionActions } from "./core/modules/sessionKey/decorators";
import { toSmartSessionsSigner } from "./core/modules/sessionKey/toSmartSessionsSigner";
import type { RecoveryParamsResponse } from "./core/services/delayModuleService";
import { createSigner } from "./core/signers/createSigner";
import type { webAuthnOptions } from "./core/signers/passkeys/types";
import type { Signer } from "./core/types";
import { createLegacySafeSmartAccount } from "./migrationKit/createLegacySafeSmartAccount";
import { retrieveLegacyWalletAddress } from "./migrationKit/retrieveLegacyWalletAddress";

import type { GrantPermissionParameters } from "./core/modules/sessionKey/decorators/grantPermission";

import { SmartSessionMode } from "@rhinestone/module-sdk";
import type { UsePermissionParameters } from "./core/modules/sessionKey/decorators/usePermission";
import type {
    CreateSessionDataParams,
    GrantPermissionResponse,
} from "./core/modules/sessionKey/types";
import {
    providerToSmartAccountSigner,
    walletClientToSmartAccountSigner,
} from "./core/signers/utils";
import {
    APINotFoundError,
    AddressIsNotAGuardianError,
    BatchCallModeNotSupportedError,
    CannotSignForAddressError,
    ChainIdNotFoundError,
    ChallengeNotFoundError,
    DelayModuleAlreadySetUpError,
    DelayModuleNotEnabledError,
    DeviceNotCompatibleWithPasskeysError,
    DeviceNotCompatibleWithSECKP256r1PasskeysError,
    EoaFallbackDisableError,
    EoaSignerRequiredError,
    ExpiryInPastError,
    ExpiryRequiredError,
    FailedToGeneratePasskeyError,
    FailedToGenerateQRCodeError,
    FailedToSerializeUrlError,
    FallbackAlreadySetError,
    FetchingProjectParamsError,
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
    NoPasskeySignerFoundForGivenChain,
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
    NoPrivateKeyFoundError,
    NoRecoveryRequestFoundError,
    NoSignerFoundError,
    OwnerToRemoveIsNotSafeOwnerError,
    PasskeyCreationError,
    PasskeySignatureFailedError,
    PasskeySignerNotValidError,
    PermissionNotInstalledError,
    PreviousModuleNotFoundError,
    RecoveryAlreadySetUpError,
    RecoveryNotActiveError,
    RecoveryNotSetUpError,
    RelayedTransactionError,
    RemoveOwnerOnUndeployedSafeError,
    RetrieveWalletFromPasskeyError,
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
    createSigner,
    createSafeSmartAccount,
    createSmartAccountClient,
    retrieveAccountAddressFromPasskeys,
    retrieveAccountAddressFromPasskeyId,
    createNewSigner,
    createNewSignerWithAccountAddress,
    serializeUrlWithSignerPayload,
    generateQRCodeUrl,
    createComethPaymasterClient,
    createLegacySafeSmartAccount,
    retrieveLegacyWalletAddress,
    importSafeActions,
    erc7579Actions,
    smartSessionActions,
    toSmartSessionsSigner,
    walletClientToSmartAccountSigner,
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
    EoaFallbackDisableError,
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
    DeviceNotCompatibleWithPasskeysError,
    DeviceNotCompatibleWithSECKP256r1PasskeysError,
    PasskeyCreationError,
    FailedToGeneratePasskeyError,
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundForGivenChain,
    NoPasskeySignerFoundInDeviceError,
    RetrieveWalletFromPasskeyError,
    PasskeySignatureFailedError,
    PasskeySignerNotValidError,
    PermissionNotInstalledError,
    MissingToAddressError,
    APINotFoundError,
    FetchingProjectParamsError,
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
    webAuthnOptions,
    GetRecoveryRequestParams,
    RecoveryParamsResponse,
    CancelRecoveryRequestParams,
    IsRecoveryActiveParams,
    IsRecoveryActiveReturnType,
    CreateSessionDataParams,
    SafeSigner,
    GrantPermissionParameters,
    GrantPermissionResponse,
    UsePermissionParameters,
};
