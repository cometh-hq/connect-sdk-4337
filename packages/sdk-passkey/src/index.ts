import {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
} from "./actions/accounts/retrieveAccountAddressFromPasskey";
import type { webAuthnOptions } from "./signers/passkeys/types";
import { toPasskeySigner } from "./signers/toPasskeySigner";
import { toPasskeyAccount } from "./accounts/toPasskeyAccount";
import { getConfigurePasskeyData } from "./accounts/safe/services/safe";
import { getPasskeyInStorage } from "./signers/passkeys/passkeyService";
import { createPasskeySigner } from "./signers/createPasskeySigner";
import { createNewSigner } from "./actions/accounts/addNewDevice";


export {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
    toPasskeySigner,
    toPasskeyAccount,
    getConfigurePasskeyData,
    getPasskeyInStorage,
    createPasskeySigner,
    createNewSigner,
};

export type {
    webAuthnOptions
};


//TODO: handle fallback checks