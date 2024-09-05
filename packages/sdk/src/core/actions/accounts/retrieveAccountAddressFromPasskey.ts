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

    return await retrieveSmartAccountAddressFromPasskey(chain, api);
};

/**
 * Function used to retrieve an account address from a passkey id
 * @param apiKey
 * @param id
 */
export const retrieveAccountAddressFromPasskeyId = async ({
    apiKey,
    chain,
    id,
    baseUrl,
}: {
    apiKey: string;
    chain: Chain;
    id: string;
    baseUrl?: string;
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskeyId({
        API: api,
        id,
        chain,
    });
};
