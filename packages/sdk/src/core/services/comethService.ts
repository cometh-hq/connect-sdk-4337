import type { Address, Chain } from "viem";
import type { ProjectParams, Wallet } from "../accounts/safe/types";
import type { ComethSigner } from "../signers/types";
import type { API } from "./API";

export const createNewWalletInDb = async ({
    chain,
    api,
    smartAccountAddress,
    signer,
}: {
    chain: Chain;
    api: API;
    smartAccountAddress: Address;
    signer: ComethSigner;
}) => {
    if (signer.type === "localWallet") {
        await api.createWallet({
            chainId: chain.id,
            smartAccountAddress,
            initiatorAddress: signer.eoaFallback.signer.address,
        });
    } else {
        await api.createWallet({
            chainId: chain.id,
            smartAccountAddress,
            initiatorAddress: signer.passkey.signerAddress,
        });
    }
};

export const getWalletsByNetworks = async ({
    api,
    smartAccountAddress,
}: { api: API; smartAccountAddress: Address }): Promise<Wallet[]> => {
    const walletsByNetworks =
        await api.getWalletByNetworks(smartAccountAddress);
    if (walletsByNetworks.length == 0) throw new Error("Wallet not found");

    return walletsByNetworks;
};

export const getProjectParamsByChain = async ({
    api,
    chain,
}: { api: API; chain: Chain }): Promise<ProjectParams> => {
    return (await api.getProjectParams(chain.id)) as ProjectParams;
};

export const doesWalletNeedToBeStored = async ({
    smartAccountAddress,
    chainId,
    api,
}: {
    smartAccountAddress?: Address;
    chainId: number;
    api: API;
}): Promise<boolean> => {
    if (!smartAccountAddress) return true;

    const walletsByNetworks = await getWalletsByNetworks({
        api,
        smartAccountAddress,
    });

    if (walletsByNetworks.find((wallet) => +wallet.chainId === chainId))
        return false;

    return true;
};
