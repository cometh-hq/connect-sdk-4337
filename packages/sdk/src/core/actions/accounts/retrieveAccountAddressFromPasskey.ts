import { API } from "@/core/services/API";
import {
    retrieveSmartAccountAddressFromPasskey,
    retrieveSmartAccountAddressFromPasskeyId,
} from "@/core/signers/passkeys/passkeyService";
import { LEGACY_API } from "@/migrationKit/services/LEGACY_API";
import type { webAuthnOptions } from "@/core/signers/passkeys/types";
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
    checkLegacy = false,
    legacyBaseUrl,
    tauriOptions
}: {
    apiKey: string;
    chain: Chain;
    fullDomainSelected?: boolean;
    rpId?: string;
    baseUrl?: string;
    publicClient?: PublicClient;
    checkLegacy?: boolean;
    legacyBaseUrl?: string;
    tauriOptions?: webAuthnOptions["tauriOptions"];
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
        legacyApi,
        tauriOptions
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
    tauriOptions
}: {
    apiKey: string;
    id: string;
    chain: Chain;
    fullDomainSelected?: boolean;
    rpId?: string;
    baseUrl?: string;
    publicClient?: PublicClient;
    tauriOptions?: webAuthnOptions["tauriOptions"];
}): Promise<Address> => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskeyId({
        API: api,
        id,
        chain,
        fullDomainSelected,
        publicClient,
        rpId,
        tauriOptions
    });
};
