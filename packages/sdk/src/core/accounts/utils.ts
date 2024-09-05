import { customChains } from "@/constants";
import type { API } from "@/core/services/API";
import { http, type Chain, createClient, extractChain } from "viem";
import * as chains from "viem/chains";

export const getNetwork = async (api: API): Promise<Chain> => {
    const params = await api.getProjectParams();
    const chainId = Number(params.chainId);

    const network = extractChain({
        chains: [...Object.values(chains), ...customChains],
        // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        id: chainId as any,
    });

    if (!network) {
        throw new Error(`Network not found for chainId: ${chainId}`);
    }

    return network;
};

export const getViemClient = (chain: Chain, rpcUrl?: string) => {
    const rpcTransport = http(rpcUrl, {
        batch: { wait: 50 },
        retryCount: 5,
        retryDelay: 200,
        timeout: 20_000,
    });

    return createClient({
        chain,
        transport: rpcTransport,
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });
};
