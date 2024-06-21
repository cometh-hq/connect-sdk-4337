import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "./constants";

import { createSafeSmartAccount } from "./core/accounts/safe/createSafeSmartAccount";
import { retrieveAccountAddressFromPasskey } from "./core/actions/accounts/retrieveAccountAddressFromPasskey";
import { createSmartAccountClient } from "./core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "./core/clients/paymaster/createPaymasterClient";
import { useAddDevice } from "./core/hooks/useAddDevice";
import { createSigner } from "./core/signers/createSigner";
import { smartAccountConnector } from "./wagmi/connector";

export {
    createSigner,
    createSafeSmartAccount,
    createSmartAccountClient,
    useAddDevice,
    retrieveAccountAddressFromPasskey,
    createComethPaymasterClient,
    smartAccountConnector,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
};
