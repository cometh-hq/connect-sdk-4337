import { SafeAbi } from "@/abis/safe";
import { SAFE_7579_ADDRESS } from "@/constants";
import { APINotFoundError } from "@/errors";
import type { ComethSafeSmartAccount } from "@cometh/connect-sdk-4337";

import { isSmartAccountDeployed } from "permissionless";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Transport,
    createPublicClient,
} from "viem";

export async function is7579Installed<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(client: Client<TTransport, TChain, TAccount>): Promise<boolean> {
    const api = client?.account?.connectApiInstance;

    if (!api) throw new APINotFoundError();

    const smartAccountAddress = client.account?.address;

    const publicClient =
        client?.account?.publicClient ??
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
            // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        } as any)) as boolean;

        return isFallbackSet;
    }

    return false;
}
