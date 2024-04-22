import type { Address } from "viem";
import { saveSignerInStorage } from "../signers/createSigner";
import type { ComethSigner } from "../signers/types";
import type { API } from "./API";
//import { getDeviceData } from "./deviceService";

export const createNewWalletInDb = async ({
    api,
    smartAccountAddress,
    signer,
}: { api: API; smartAccountAddress: Address; signer: ComethSigner }) => {
    {
        // if (signer.type === "localWallet") {
        //     await api.initWallet({
        //         ownerAddress: signer.eoaFallback.signer.address,
        //     });
        // } else {
        //     await api.initWalletWithPasskey({
        //         walletAddress: smartAccountAddress,
        //         publicKeyId: signer.passkey.id,
        //         publicKeyX: signer.passkey.pubkeyCoordinates.x,
        //         publicKeyY: signer.passkey.pubkeyCoordinates.y,
        //         deviceData: getDeviceData(),
        //     });
        // }
    }
    await saveSignerInStorage(signer, smartAccountAddress);
};

export const connectToExistingWallet = async ({
    api,
    smartAccountAddress,
}: { api: API; smartAccountAddress: Address }) => {
    {
        const storedWallet = await api.getWalletInfos(smartAccountAddress);
        if (!storedWallet) throw new Error("Wallet not found");
    }
};