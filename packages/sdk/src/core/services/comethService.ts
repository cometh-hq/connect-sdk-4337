import type { Address, Chain } from "viem";
import type { ProjectParams, Wallet } from "../accounts/safe/types";
import { getSignerAddress } from "../signers/createSigner";
import type { Signer } from "../signers/types";
import type { API } from "./API";
import { getDeviceData } from "./deviceService";

export const createNewWalletInDb = async ({
    chain,
    api,
    smartAccountAddress,
    signer,
}: {
    chain: Chain;
    api: API;
    smartAccountAddress: Address;
    signer: Signer;
}): Promise<boolean> => {
    const initiatorAddress = getSignerAddress(signer);

    if (signer.type === "passkey") {
        return await api.initWallet({
            chainId: chain.id,
            smartAccountAddress,
            initiatorAddress: initiatorAddress,
            publicKeyId: signer.passkey.id,
            publicKeyX: signer.passkey.pubkeyCoordinates.x,
            publicKeyY: signer.passkey.pubkeyCoordinates.y,
            deviceData: getDeviceData(),
        });
    }

    return await api.initWallet({
        chainId: chain.id,
        smartAccountAddress,
        initiatorAddress: initiatorAddress,
    });
};

export const getWalletsByNetworks = async ({
    api,
    smartAccountAddress,
}: { api: API; smartAccountAddress: Address }): Promise<Wallet[]> => {
    const walletsByNetworks =
        await api.getWalletByNetworks(smartAccountAddress);

    return walletsByNetworks;
};

export const getProjectParamsByChain = async ({
    api,
    chain,
}: { api: API; chain: Chain }): Promise<ProjectParams> => {
    return (await api.getProjectParams(chain.id)) as ProjectParams;
};

export const getWalletByChainId = async ({
    smartAccountAddress,
    chainId,
    api,
}: {
    smartAccountAddress: Address;
    chainId: number;
    api: API;
}): Promise<Wallet | undefined> => {
    const walletsByNetworks = await getWalletsByNetworks({
        api,
        smartAccountAddress,
    });

    return walletsByNetworks.find((wallet) => +wallet.chainId === chainId);
};
