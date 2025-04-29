import { http, type Chain, type PublicClient, createClient } from "viem";

export const getViemClient = (chain: Chain, publicClient?: PublicClient) => {
    return (
        publicClient ??
        createClient({
            chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        })
    );
};
