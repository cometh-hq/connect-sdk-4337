import { API } from "@/core/services/API";
import {
    retrieveSmartAccountAddressFromPasskey,
    retrieveSmartAccountAddressFromPasskeyId,
} from "@/core/signers/passkeys/passkeyService";
import type { webAuthnOptions } from "@/core/signers/passkeys/types";
import { InvalidParamsError } from "@/errors";
import { LEGACY_API } from "@/migrationKit/services/LEGACY_API";
import { type Address, type Chain, type Hex, type PublicClient, isHex, size } from "viem";

export type RetrieveAccountAddressWithSignatureResponse = {
    smartAccountAddress: Address;
    signature: Hex;
    publicKeyId: Hex;
};

const _assertValidHash = (hash: Hex): void => {
    if (!isHex(hash) || size(hash) !== 32) {
        throw new InvalidParamsError(
            "hash must be a 32-byte 0x-prefixed hex string"
        );
    }
};

type RetrieveFromPasskeysParams = {
    apiKey: string;
    chain: Chain;
    fullDomainSelected?: boolean;
    rpId?: string;
    baseUrl?: string;
    publicClient?: PublicClient;
    checkLegacy?: boolean;
    legacyBaseUrl?: string;
    tauriOptions?: webAuthnOptions["tauriOptions"];
};

type RetrieveFromPasskeyIdParams = {
    apiKey: string;
    id: string;
    chain: Chain;
    fullDomainSelected?: boolean;
    rpId?: string;
    baseUrl?: string;
    publicClient?: PublicClient;
    tauriOptions?: webAuthnOptions["tauriOptions"];
};

const _retrieveFromPasskeys = async ({
    apiKey,
    chain,
    fullDomainSelected = false,
    rpId,
    baseUrl,
    publicClient,
    checkLegacy = false,
    legacyBaseUrl,
    tauriOptions,
    hash,
}: RetrieveFromPasskeysParams & { hash?: Hex }) => {
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
        tauriOptions,
        hash
    );
};

const _retrieveFromPasskeyId = async ({
    apiKey,
    id,
    chain,
    fullDomainSelected = false,
    rpId,
    baseUrl,
    publicClient,
    tauriOptions,
    hash,
}: RetrieveFromPasskeyIdParams & { hash?: Hex }) => {
    const api = new API(apiKey, baseUrl);

    return await retrieveSmartAccountAddressFromPasskeyId({
        API: api,
        id,
        chain,
        fullDomainSelected,
        publicClient,
        rpId,
        tauriOptions,
        hash,
    });
};

/**
 * Function used to retrieve an account address from passkeys
 * @param apiKey
 * @param chain
 * @param fullDomainSelected
 * @param rpId
 */
export const retrieveAccountAddressFromPasskeys = async (
    params: RetrieveFromPasskeysParams
): Promise<Address> => {
    const { smartAccountAddress } = await _retrieveFromPasskeys(params);
    return smartAccountAddress;
};

/**
 * Function used to retrieve an account address from a passkey id
 * @param apiKey
 * @param id
 * @param chain
 * @param fullDomainSelected
 * @param rpId
 */
export const retrieveAccountAddressFromPasskeyId = async (
    params: RetrieveFromPasskeyIdParams
): Promise<Address> => {
    const { smartAccountAddress } = await _retrieveFromPasskeyId(params);
    return smartAccountAddress;
};

/**
 * Retrieves an account address from passkeys and signs the provided hash
 * in the same WebAuthn ceremony. Returns the wallet address, the signature
 * payload and the public key id, so callers can authenticate a user in a
 * single biometric prompt.
 */
export const retrieveAccountAddressFromPasskeysWithSignature = async (
    params: RetrieveFromPasskeysParams & { hash: Hex }
): Promise<RetrieveAccountAddressWithSignatureResponse> => {
    _assertValidHash(params.hash);

    const { smartAccountAddress, signature, publicKeyId } =
        await _retrieveFromPasskeys(params);

    return {
        smartAccountAddress,
        signature,
        publicKeyId,
    };
};

/**
 * Retrieves an account address from a passkey id and signs the provided hash
 * in the same WebAuthn ceremony. Returns the wallet address, the signature
 * payload and the public key id.
 */
export const retrieveAccountAddressFromPasskeyIdWithSignature = async (
    params: RetrieveFromPasskeyIdParams & { hash: Hex }
): Promise<RetrieveAccountAddressWithSignatureResponse> => {
    _assertValidHash(params.hash);

    const { smartAccountAddress, signature, publicKeyId } =
        await _retrieveFromPasskeyId(params);

    return {
        smartAccountAddress,
        signature,
        publicKeyId,
    };
};
