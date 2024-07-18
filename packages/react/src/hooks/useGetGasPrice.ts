import { useSmartAccount } from "@/hooks";
import { useQuery } from "@tanstack/react-query";
import { http, type Chain, createPublicClient } from "viem";
import type { UseQueryParameters } from "wagmi/query";

export const useGetGasPrice = (
    rpcUrl?: string,
    queryProps?: UseQueryParameters
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    return useQuery(
        {
            queryKey: ["gasPrice"],
            queryFn: async () => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }

                const publicClient = createPublicClient({
                    chain: smartAccountClient.chain as Chain,
                    transport: http(rpcUrl),
                });

                const { maxFeePerGas } =
                    await publicClient.estimateFeesPerGas();

                return {
                    maxFeePerGas: (maxFeePerGas as bigint) * 2n,
                    maxPriorityFeePerGas: maxFeePerGas,
                };
            },
            ...queryProps,
        },
        queryClient
    );
};
