import { http, type Chain, createClient } from "viem";

export const getViemClient = (
    chain: Chain,
    rpcUrl?: string,
    clientTimeout?: number
) => {
    const rpcTransport = http(rpcUrl, {
        batch: { wait: 50 },
        retryCount: 5,
        retryDelay: 200,
        timeout: clientTimeout ?? 20_000,
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
