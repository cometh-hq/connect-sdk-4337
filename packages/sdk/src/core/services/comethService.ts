import type { Address, Chain } from "viem";
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

export const connectToExistingWallet = async ({
    chain,
    api,
    smartAccountAddress,
}: { chain: Chain; api: API; smartAccountAddress: Address }): Promise<void> => {
    const storedWallet = await api.getWallet(smartAccountAddress, chain.id);

    if (!storedWallet) throw new Error("Wallet not found");
};
