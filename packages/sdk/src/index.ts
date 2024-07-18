import {
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    customChains,
} from "./constants";

import {
    type SafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "./core/accounts/safe/createSafeSmartAccount";
import { retrieveAccountAddressFromPasskey } from "./core/actions/accounts/retrieveAccountAddressFromPasskey";
import type { EnrichedOwner } from "./core/actions/accounts/safe/owners/safeOwnerActions";
import type { AddSessionKeyParams, Session } from "./core/actions/accounts/safe/sessionKeys/utils";
import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "./core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import { useHandleDevice } from "./core/hooks/useHandleDevice";
import { createSigner } from "./core/signers/createSigner";
import type { Signer } from "./core/types";
import { smartAccountConnector } from "./wagmi/connector";

export {
    createSigner,
    createSafeSmartAccount,
    createSmartAccountClient,
    useHandleDevice,
    retrieveAccountAddressFromPasskey,
    createComethPaymasterClient,
    smartAccountConnector,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    customChains,
};

export type {
    SafeSmartAccount,
    ComethSmartAccountClient,
    createSafeSmartAccountParameters,
    Signer,
    EnrichedOwner,
    AddSessionKeyParams,
    Session

};
