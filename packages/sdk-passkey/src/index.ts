import { toPasskeyAccount } from "./accounts/toPasskeyAccount";
import { createNewSigner } from "./actions/accounts/addNewDevice";
import {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
} from "./actions/accounts/retrieveAccountAddressFromPasskey";
import type { webAuthnOptions } from "./signers/passkeys/types";
import { passkeySetupTx, toPasskeySigner } from "./signers/toPasskeySigner";

export {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
    toPasskeySigner,
    toPasskeyAccount,
    passkeySetupTx,
    createNewSigner,
};

export type { webAuthnOptions };
