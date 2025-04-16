import { SafeAbi } from "@/abis/safe";
import { SAFE_7579_ADDRESS } from "@/constants";

import type { ReadContractParameters } from "viem";

import { isSmartAccountDeployed } from "permissionless";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type PublicClient,
    type Transport,
    createPublicClient,
} from "viem";
import type { SmartAccount } from "viem/account-abstraction";

export async function is7579Installed<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(client: Client<TTransport, TChain, TAccount>): Promise<boolean> {
    const smartAccountAddress = client.account?.address;

    const publicClient =
        (client?.account?.client as PublicClient) ??
        createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });
    createPublicClient({
        chain: client.chain,
        transport: http(),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const isDeployed = await isSmartAccountDeployed(
        publicClient,
        smartAccountAddress as Address
    );

    if (isDeployed) {
        const isFallbackSet = (await publicClient.readContract({
            address: smartAccountAddress,
            abi: SafeAbi,
            functionName: "isModuleEnabled",
            args: [SAFE_7579_ADDRESS as Address],
        } as ReadContractParameters)) as boolean;

        return isFallbackSet;
    }

    return false;
}
