import { toPasskeyAccount } from "./accounts/toPasskeyAccount";
import { createNewPasskeySigner } from "./actions/addNewDevice";
import { addPasskeyOwner } from "./actions/addPasskeyOwnerActions";
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
};

export type { webAuthnOptions };
