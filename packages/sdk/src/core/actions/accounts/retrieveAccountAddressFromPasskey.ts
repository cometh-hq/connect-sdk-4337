import { API } from "@/core/services/API";
import {
    retrieveSmartAccountAddressFromPasskey,
    retrieveSmartAccountAddressFromPasskeyId,
} from "@/core/signers/passkeys/passkeyService";
import type { Address, Chain, PublicClient } from "viem";

/**
 * Function used to retrieve an account address from passkeys
 * @param apiKey
 * @param chain
 * @param fullDomainSelected
 */
export const retrieveAccountAddressFromPasskeys = async ({
    apiKey,
    chain,
    fullDomainSelected = false,
    baseUrl,
    publicClient,
}: {
    apiKey: string;
    chain: Chain;
    fullDomainSelected: boolean;
    baseUrl?: string;
    publicClient?: PublicClient;
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskey(
        api,
        chain,
        fullDomainSelected,
        publicClient
    );
};

/**
 * Function used to retrieve an account address from a passkey id
 * @param apiKey
 * @param id
 * @param chain
 * @param fullDomainSelected
 */
export const retrieveAccountAddressFromPasskeyId = async ({
    apiKey,
    id,
    chain,
    fullDomainSelected = false,
    baseUrl,
    publicClient,
}: {
    apiKey: string;
    id: string;
    chain: Chain;
    fullDomainSelected: boolean;
    baseUrl?: string;
    publicClient?: PublicClient;
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskeyId({
        API: api,
        id,
        chain,
        fullDomainSelected,
        publicClient,
    });
};
