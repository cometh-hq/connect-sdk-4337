import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "./constants";

import { createModularSmartAccount } from "./core/accounts/modular-account/createModularAccount";
import { createSafeSmartAccount } from "./core/accounts/safe/createSafeSmartAccount";
import { retrieveAccountAddressFromPasskey } from "./core/actions/retrieveAccountAddressFromPasskey";
import { createSmartAccountClient } from "./core/clients/createModularClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import { useSignerRequests } from "./core/hooks/useSignerRequests";
import { createSigner } from "./core/signers/createSigner";

export {
    createSigner,
    createModularSmartAccount,
    createSafeSmartAccount,
    createSmartAccountClient,
    useSignerRequests,
    retrieveAccountAddressFromPasskey,
    createComethPaymasterClient,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
};
