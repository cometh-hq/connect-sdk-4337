import type { Address } from "viem";
import { API } from "../services/API";
import { retrieveSmartAccountAddressFromPasskey } from "../signers/passkeys/passkeyService";

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
