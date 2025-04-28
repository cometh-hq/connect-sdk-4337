import type { Address, Chain } from "viem";
import type { ProjectParams } from "../accounts/safe/types";
import type { PasskeySigner } from "../signers/types";
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
    signer: PasskeySigner;
}): Promise<boolean> => {
    const initiatorAddress = signer.passkey.signerAddress;
    return await api.initWallet({
        chainId: chain.id,
        smartAccountAddress,
        initiatorAddress: initiatorAddress,
        publicKeyId: signer.passkey.id,
        publicKeyX: signer.passkey.pubkeyCoordinates.x,
        publicKeyY: signer.passkey.pubkeyCoordinates.y,
        deviceData: getDeviceData(),
    });
};

export const getProjectParamsByChain = async ({
    api,
    chain,
}: { api: API; chain: Chain }): Promise<ProjectParams> => {
    return (await api.getProjectParams(chain.id)) as ProjectParams;
};
