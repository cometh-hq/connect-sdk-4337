import { toPasskeyAccount } from "./accounts/toPasskeyAccount";
import {
    createNewPasskeySigner,
    generateQRCodeUrl,
    serializeUrlWithSignerPayload,
} from "./actions/addNewDevice";
import type { QRCodeOptions } from "./actions/addNewDevice";
import { passkeyActions } from "./actions/decorators/passkeyActions";
import {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
} from "./actions/retrieveAccountAddressFromPasskey";
import type { webAuthnOptions } from "./signers/passkeyService/types";
import { passkeySetupTx, toPasskeySigner } from "./signers/toPasskeySigner";

export {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
    toPasskeySigner,
    toPasskeyAccount,
    passkeySetupTx,
    createNewPasskeySigner,
    passkeyActions,
    generateQRCodeUrl,
    serializeUrlWithSignerPayload,
};

export type { webAuthnOptions, QRCodeOptions };
