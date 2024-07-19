import { useSmartAccount } from "@/hooks";
import { useQuery } from "@tanstack/react-query";
import { http, type Chain, createPublicClient } from "viem";
import type { UseQueryParameters } from "wagmi/query";

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
 * import { useEffect } from "react";
 *
 * export const GasPriceDisplay = () => {
 *   const {
 *     getGasPrice,
 *     data: gasPrice,
 *     isLoading,
 *     error,
 *     refetch
 *   } = useGetGasPrice();
 *
 *   useEffect(() => {
 *     // Manually trigger gas price fetch
 *     getGasPrice();
 *   }, [getGasPrice]);
 *
 *   if (isLoading) return <p>Loading gas prices...</p>;
 *   if (error) return <p>Error fetching gas prices: {error.message}</p>;
 *
 *   return (
 *     <div>
 *       <h2>Current Gas Prices</h2>
 *       <p>Max Fee Per Gas: {formatEther(gasPrice.maxFeePerGas)} ETH</p>
 *       <p>Max Priority Fee Per Gas: {formatEther(gasPrice.maxPriorityFeePerGas)} ETH</p>
 *       <button onClick={() => refetch()}>Refresh Gas Prices</button>
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `getGasPrice`: A function to manually trigger the gas price fetch.
 * - All properties from the query object (`data`, `isLoading`, `error`, `refetch`, etc.)
 */

export const useGetGasPrice = (
    rpcUrl?: string,
    queryProps?: UseQueryParameters
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const query = useQuery(
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

    const getGasPrice = async () => {
        return query.refetch();
    };

    return {
        getGasPrice,
        ...query,
    };
};