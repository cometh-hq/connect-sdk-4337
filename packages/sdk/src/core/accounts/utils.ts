import { customChains } from "@/constants";
import { http, type Chain, createClient, extractChain } from "viem";
import * as chains from "viem/chains";
import type { API } from "../services/API";

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

export const getClient = async (api: API, rpcUrl?: string) => {
    const chain = await getNetwork(api);
    return getViemClient(chain, rpcUrl);
};
