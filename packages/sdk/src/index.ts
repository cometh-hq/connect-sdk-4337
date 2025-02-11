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

import type { UsePermissionParameters } from "./core/modules/sessionKey/decorators/usePermission";
import type {
    CreateSessionDataParams,
    GrantPermissionResponse,
} from "./core/modules/sessionKey/types";
import { SmartSessionMode } from "@rhinestone/module-sdk";

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
    ENTRYPOINT_ADDRESS_V07,
    customChains,
    SmartSessionMode
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
