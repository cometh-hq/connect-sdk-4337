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
 * @param rpId
 */
export const retrieveAccountAddressFromPasskeys = async ({
    apiKey,
    chain,
    fullDomainSelected = false,
    rpId,
    baseUrl,
    publicClient,
}: {
    apiKey: string;
    chain: Chain;
    fullDomainSelected: boolean;
    rpId: string;
    baseUrl?: string;
    publicClient?: PublicClient;
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskey(
        api,
        chain,
        fullDomainSelected,
        rpId,
        publicClient
    );
};

/**
 * Function used to retrieve an account address from a passkey id
 * @param apiKey
 * @param id
 * @param chain
 * @param fullDomainSelected
 * @param rpId
 */
export const retrieveAccountAddressFromPasskeyId = async ({
    apiKey,
    id,
    chain,
    fullDomainSelected = false,
    rpId,
    baseUrl,
    publicClient,
}: {
    apiKey: string;
    id: string;
    chain: Chain;
    fullDomainSelected: boolean;
    rpId?: string;
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
        rpId,
    });
};
