import { API } from "@/core/services/API";
import {
    retrieveSmartAccountAddressFromPasskey,
    retrieveSmartAccountAddressFromPasskeyId,
} from "@/core/signers/passkeys/passkeyService";
import type { Address, Chain } from "viem";

/**
 * Function used to retrieve an account address from passkeys
 * @param apiKey
 */
export const retrieveAccountAddressFromPasskeys = async (
    apiKey: string,
    chain: Chain,
    baseUrl?: string
): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskey(api, chain);
};

/**
 * Function used to retrieve an account address from a passkey id
 * @param apiKey
 * @param id
 */
export const retrieveAccountAddressFromPasskeyId = async ({
    apiKey,
    id,
    chain,
    baseUrl,
}: {
    apiKey: string;
    id: string;
    chain: Chain;
    baseUrl?: string;
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskeyId({
        API: api,
        id,
        chain,
    });
};
