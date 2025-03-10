import { SmartAccountNotFoundError } from "@/errors";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { http, type Chain, createPublicClient } from "viem";

type GasPriceResult = {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
};

/**
 * @description A hook that fetches the current gas price for transactions on the connected blockchain.
 *
 * This hook uses a public client to estimate the current gas fees. It returns both the `maxFeePerGas`
 * and `maxPriorityFeePerGas`. The `maxFeePerGas` is doubled to provide a buffer for potential gas price fluctuations.
 *
 * @param rpcUrl Optional RPC URL to use for the public client. If not provided, it will use the default RPC URL.
 * @param queryProps Optional query properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useGetGasPrice } from "@/hooks/useGetGasPrice";
 * import { formatEther } from "viem";
 *
 * export const GasPriceDisplay = () => {
 *   const { data: gasPrice, isLoading, error } = useGetGasPrice();
 *
 *   if (isLoading) return <p>Loading gas prices...</p>;
 *   if (error) return <p>Error fetching gas prices: {error.message}</p>;
 *
 *   return (
 *     <div>
 *       <h2>Current Gas Prices</h2>
 *       <p>Max Fee Per Gas: {formatEther(gasPrice.maxFeePerGas)} ETH</p>
 *       <p>Max Priority Fee Per Gas: {formatEther(gasPrice.maxPriorityFeePerGas)} ETH</p>
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing the query result and related properties.
 */
export const useGetGasPrice = (
    rpcUrl?: string,
    queryProps?: Omit<
        UseQueryOptions<GasPriceResult, Error>,
        "queryKey" | "queryFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    return useQuery(
        {
            queryKey: ["gasPrice", rpcUrl],
            queryFn: async (): Promise<GasPriceResult> => {
                if (!smartAccountClient) {
                    throw new SmartAccountNotFoundError();
                }

                const publicClient = createPublicClient({
                    chain: smartAccountClient.chain as Chain,
                    transport: http(rpcUrl),
                });

                const { maxFeePerGas } =
                    await publicClient.estimateFeesPerGas();

                return {
                    maxFeePerGas: (maxFeePerGas as bigint) * 2n,
                    maxPriorityFeePerGas: maxFeePerGas as bigint,
                };
            },
            ...queryProps,
        },
        queryClient
    );
};
