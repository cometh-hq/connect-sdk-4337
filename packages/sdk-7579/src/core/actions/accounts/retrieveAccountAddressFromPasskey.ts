import { API } from "@/core/services/API";
import {
    retrieveSmartAccountAddressFromPasskey,
    retrieveSmartAccountAddressFromPasskeyId,
} from "@/core/signers/passkeys/passkeyService";
import type { Address } from "viem";

/**
 * Function used to retrieve an account address from passkeys
 * @param apiKey
 */
export const retrieveAccountAddressFromPasskeys = async (
    apiKey: string,
    baseUrl?: string
): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskey(api);
};

/**
 * Function used to retrieve an account address from a passkey id
 * @param apiKey
 * @param id
 */
export const retrieveAccountAddressFromPasskeyId = async ({
    apiKey,
    id,
    baseUrl,
}: {
    apiKey: string;
    id: string;
    baseUrl?: string;
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskeyId({ API: api, id });
};
