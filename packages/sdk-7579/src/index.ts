import { ENTRYPOINT_ADDRESS_V07, customChains } from "./constants";

import {
    type SafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "./core/accounts/safe/createSafeSmartAccount";
import { getNetwork } from "./core/accounts/utils";
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
import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "./core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import type { RecoveryParamsResponse } from "./core/services/delayModuleService";
import { createSigner } from "./core/signers/createSigner";
import type { webAuthnOptions } from "./core/signers/passkeys/types";
import type { Signer } from "./core/types";
import { smartAccountConnector } from "./wallet/connector";
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
    getNetwork,
    ENTRYPOINT_ADDRESS_V07,
    customChains,
    smartAccountConnector,
};

export type {
    SafeSmartAccount,
    ComethSmartAccountClient,
    createSafeSmartAccountParameters,
    Signer,
    QRCodeOptions,
    webAuthnOptions,
    RecoveryParamsResponse,
};
