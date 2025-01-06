import { ENTRYPOINT_ADDRESS_V07, customChains } from "./constants";

import {
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
import type { SetUpRecoveryModuleParams } from "./core/actions/accounts/safe/recovery/setUpRecoveryModule";
import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "./core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import type { RecoveryParamsResponse } from "./core/services/delayModuleService";
import { createSigner } from "./core/signers/createSigner";
import type { webAuthnOptions } from "./core/signers/passkeys/types";
import type { Signer } from "./core/types";
import { createLegacySafeSmartAccount } from "./migrationKit/createLegacySafeSmartAccount";
import { retrieveLegacyWalletAddress } from "./migrationKit/retrieveLegacyWalletAddress";
import { smartAccountConnector } from "./wagmi/connector";

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
    smartAccountConnector,
    createLegacySafeSmartAccount,
    retrieveLegacyWalletAddress,
    importSafeActions,
    ENTRYPOINT_ADDRESS_V07,
    customChains,
};

export type {
    ComethSmartAccountClient,
    createSafeSmartAccountParameters,
    Signer,
    EnrichedOwner,
    QRCodeOptions,
    webAuthnOptions,
    SetUpRecoveryModuleParams,
    GetRecoveryRequestParams,
    RecoveryParamsResponse,
    CancelRecoveryRequestParams,
    IsRecoveryActiveParams,
    IsRecoveryActiveReturnType,
};
