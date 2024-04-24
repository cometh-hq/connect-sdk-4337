import { ENTRYPOINT_ADDRESS_V06 } from "./constants";

import { signerToKernelSmartAccount } from "./core/accounts/kernel/createKernelAccount";
import { signerToModularSmartAccount } from "./core/accounts/modular-account/createModularAccount";
import { retrieveAccountAddressFromPasskey } from "./core/actions/retrieveAccountAddressFromPasskey";
import { createSmartAccountClient } from "./core/clients/createModularClient";
import { useSignerRequests } from "./core/hooks/useSignerRequests";
import { createSigner } from "./core/signers/createSigner";

export {
    createSigner,
    signerToKernelSmartAccount,
    signerToModularSmartAccount,
    createSmartAccountClient,
    useSignerRequests,
    retrieveAccountAddressFromPasskey,
    ENTRYPOINT_ADDRESS_V06,
};
