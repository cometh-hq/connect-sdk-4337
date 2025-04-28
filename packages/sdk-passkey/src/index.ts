import { toPasskeyAccount } from "./accounts/toPasskeyAccount";
import { addPasskeyOwner } from "./actions/addPasskeyOwnerActions";
import {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
} from "./actions/retrieveAccountAddressFromPasskey";
import type { webAuthnOptions } from "./signers/passkeyService/types";
import { createPasskeySigner } from "./signers/toPasskeySigner";
import { passkeySetupTx, toPasskeySigner } from "./signers/toPasskeySigner";

export {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
    toPasskeySigner,
    toPasskeyAccount,
    passkeySetupTx,
    createPasskeySigner,
    addPasskeyOwner,
};

export type { webAuthnOptions };
