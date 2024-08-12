import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { executeTransaction } from "@/core/accounts/safe/services/safe";
import { getNetwork } from "@/core/accounts/utils";
import { API } from "@/core/services/API";
import {
    http,
    type Address,
    type WalletClient,
    createPublicClient,
    encodeFunctionData,
} from "viem";
import { type CreateNewSignerParams, createNewSigner } from "../addNewDevice";

export const importSafe = async ({
    apiKey,
    walletClient,
    safeAddress,
    params,
    rpcUrl,
    baseUrl,
}: {
    apiKey: string;
    walletClient: WalletClient;
    safeAddress: Address;
    params?: CreateNewSignerParams;
    rpcUrl?: string;
    baseUrl?: string;
}): Promise<void> => {
    const api = new API(apiKey, baseUrl);
    const chain = await getNetwork(api);

    const newSigner = await createNewSigner(apiKey, baseUrl, params);

    const publicClient = createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const currentOwners = (await publicClient.readContract({
        address: safeAddress,
        abi: SafeAbi,
        functionName: "getOwners",
    })) as Address[];

    const isAlreadyOwner = currentOwners.includes(newSigner.signerAddress);

    if (!isAlreadyOwner) {
        const addOwnerData = encodeFunctionData({
            abi: SafeAbi,
            functionName: "addOwnerWithThreshold",
            args: [newSigner.signerAddress, 1],
        });

        await executeTransaction(publicClient, walletClient, safeAddress, {
            to: safeAddress,
            value: BigInt(0),
            data: addOwnerData,
            operation: 0,
        });
    }

    await api.importExternalSafe({
        smartAccountAddress: safeAddress,
        ...newSigner,
    });
};
