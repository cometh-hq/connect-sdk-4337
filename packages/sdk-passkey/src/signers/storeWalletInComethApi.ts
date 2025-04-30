import type { API } from "@/services/API";
import { createNewWalletInDb } from "@/services/comethService";

import type { PasskeySigner } from "@/signers/passkeyService/types";

import { getSafeAddressFromInitializer } from "@/accounts/safeService/safe";
import {
    type Address,
    type Chain,
    type Hex,
    type PublicClient,
    hexToBigInt,
    zeroHash,
} from "viem";

/**
 * Get the predicted account address for a Safe smart account
 */
export const getAccountAddress = async ({
    chain,
    singletonAddress,
    safeProxyFactoryAddress,
    saltNonce = zeroHash,
    initializer,
    publicClient,
}: {
    chain: Chain;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce?: Hex;
    initializer: Hex;
    publicClient?: PublicClient;
}): Promise<Address> => {
    return getSafeAddressFromInitializer({
        chain,
        initializer,
        saltNonce: hexToBigInt(saltNonce),
        safeProxyFactoryAddress,
        safeSingletonAddress: singletonAddress,
        publicClient,
    });
};

/**
 * Store wallet in Cometh API and return the smart account address
 */
export const storeWalletInComethApi = async ({
    chain,
    signer,
    api,
    smartAccountAddress,
}: {
    chain: Chain;
    signer: PasskeySigner;
    api: API;
    smartAccountAddress: Address;
}): Promise<{ smartAccountAddress: Address; isNewWallet: boolean }> => {
    const isNewWallet = await createNewWalletInDb({
        chain,
        api,
        smartAccountAddress,
        signer,
    });

    return { smartAccountAddress, isNewWallet };
};
