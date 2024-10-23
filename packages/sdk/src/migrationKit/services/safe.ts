import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    createPublicClient,
    getContract,
} from "viem";
import type { LEGACY_API } from "../LEGACY_API";
import { SafeLegacyAbi } from "../abi/safeLegacy";

export const isSafeOwner = async ({
    safeAddress,
    signerAddress,
    chain,
    rpcUrl,
}: {
    safeAddress: Address;
    signerAddress: Address;
    chain: Chain;
    rpcUrl?: string;
}): Promise<boolean> => {
    const publicClient = createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
    });

    const safe = getContract({
        address: safeAddress,
        abi: SafeLegacyAbi,
        client: publicClient,
    });

    const isDeployed = await isSmartAccountDeployed(publicClient, safeAddress);

    if (!isDeployed) throw new Error("Safe not deployed");

    return (await safe.read.isOwner([signerAddress])) as boolean;
};

export const isSigner = async (
    signerAddress: Address,
    walletAddress: Address,
    chain: Chain,
    API: LEGACY_API
): Promise<boolean> => {
    try {
        const owner = await isSafeOwner({
            safeAddress: walletAddress,
            chain,
            signerAddress,
        });

        if (!owner) return false;
    } catch {
        const predictedWalletAddress =
            await API.getWalletAddress(signerAddress);

        if (predictedWalletAddress !== walletAddress) return false;
    }

    return true;
};
