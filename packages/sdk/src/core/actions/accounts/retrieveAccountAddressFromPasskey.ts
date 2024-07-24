import { API } from "@/core/services/API";
import { retrieveSmartAccountAddressFromPasskey } from "@/core/signers/passkeys/passkeyService";
import type { Address } from "viem";

/**
 * Function used to retrieve an account address from a passkey
 * @param apiKey
 */
export const retrieveAccountAddressFromPasskey = async (
    apiKey: string,
    baseUrl?: string
): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskey(api);
};
