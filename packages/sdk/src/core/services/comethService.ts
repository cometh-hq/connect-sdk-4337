import type { Address } from "viem";
import { saveSignerInStorage } from "../signers/createSigner";
import type { ComethSigner } from "../signers/types";
import type { WalletImplementation } from "../types";
import type { API } from "./API";
import { getDeviceData } from "./deviceService";

export const createNewWalletInDb = async ({
    api,
    smartAccountAddress,
    signer,
    walletImplementation,
}: {
    api: API;
    smartAccountAddress: Address;
    signer: ComethSigner;
    walletImplementation: WalletImplementation;
}) => {
    {
        if (signer.type === "localWallet") {
            await api.initWallet({
                smartAccountAddress,
                ownerAddress: signer.eoaFallback.signer.address,
                walletImplementation,
            });
        } else {
            await api.initWalletWithPasskey({
             smartAccountAddress,
                publicKeyId: signer.passkey.id,
                publicKeyX: signer.passkey.pubkeyCoordinates.x,
                publicKeyY: signer.passkey.pubkeyCoordinates.y,
                deviceData: getDeviceData(),
                walletImplementation,
            });
        }
    }
    await saveSignerInStorage(signer, smartAccountAddress);
};

export const connectToExistingWallet = async ({
    api,
    smartAccountAddress,
}: { api: API; smartAccountAddress: Address }): Promise<void> => {
    {
        const storedWallet = await api.getWalletInfos(smartAccountAddress);
        if (!storedWallet) throw new Error("Wallet not found");
    }
};
