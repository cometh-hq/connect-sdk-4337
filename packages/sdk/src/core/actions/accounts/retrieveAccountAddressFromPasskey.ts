import { API } from "@/core/services/API";
import {
    retrieveSmartAccountAddressFromPasskey,
    retrieveSmartAccountAddressFromPasskeyId,
} from "@/core/signers/passkeys/passkeyService";
import { LEGACY_API } from "@/migrationKit/services/LEGACY_API";
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
    legacyBaseUrl,
    publicClient,
    checkLegacy = false,
}: {
    apiKey: string;
    chain: Chain;
    fullDomainSelected?: boolean;
    rpId?: string;
    baseUrl?: string;
    legacyBaseUrl?: string;
    publicClient?: PublicClient;
    checkLegacy?: boolean;
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);
    let legacyApi: LEGACY_API | undefined;

    if (checkLegacy) {
        legacyApi = new LEGACY_API(apiKey, legacyBaseUrl);
    }

    return await retrieveSmartAccountAddressFromPasskey(
        api,
        chain,
        fullDomainSelected,
        rpId,
        publicClient,
        legacyApi
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
    fullDomainSelected?: boolean;
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
