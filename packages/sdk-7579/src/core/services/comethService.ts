import type { Address } from "viem";
import type { ComethSigner } from "../signers/types";
import type { API } from "./API";

export const createNewWalletInDb = async ({
    api,
    smartAccountAddress,
    signer,
}: {
    api: API;
    smartAccountAddress: Address;
    signer: ComethSigner;
}) => {
    {
        if (signer.type === "localWallet") {
            await api.createWallet({
                smartAccountAddress,
                initiatorAddress: signer.eoaFallback.signer.address,
            });
        } else {
            await api.createWallet({
                smartAccountAddress,
                initiatorAddress: signer.passkey.signerAddress,
            });
        }
    }
};

export const connectToExistingWallet = async ({
    api,
    smartAccountAddress,
}: { api: API; smartAccountAddress: Address }): Promise<void> => {
    {
        const storedWallet = await api.getWallet(smartAccountAddress);

        if (!storedWallet) throw new Error("Wallet not found");
    }
};
