import { toPasskeyAccount } from "./accounts/toPasskeyAccount";
import { createNewPasskeySigner } from "./actions/addNewDevice";
import { addPasskeyOwner } from "./actions/addPasskeyOwnerActions";
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
    addPasskeyOwner,
    passkeyActions,
};

export type { webAuthnOptions };
