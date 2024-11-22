import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useMutation } from "@tanstack/react-query";
import type { MutationOptionsWithoutMutationFn, Transaction } from "./types";

/**
 * Props for the useGetTransactionCost hook.
 * @property {Transaction | Transaction[]} transactions - A single transaction or an array of transactions to get cost for.
 */
export type UseGetTransactionCostProps = {
    transactions: Transaction | Transaction[];
};

/**
 * Type for the getTransactionCost function.
 * This function doesn't return a promise, suitable for fire-and-forget usage.
 */
export type UseGetTransactionCostMutate = (
    variables: UseGetTransactionCostProps
) => void;

/**
 * Type for the getTransactionCostAsync function.
 * This function returns a promise that resolves to the transaction cost in wei.
 */
export type UseGetTransactionCostMutateAsync = (
    variables: UseGetTransactionCostProps
) => Promise<{
    totalGasCost: bigint;
}>;

// Return type of the hook
export type UseGetTransactionCostReturn = {
    data?: bigint;
    error: unknown;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    getTransactionCost: UseGetTransactionCostMutate;
    getTransactionCostAsync: UseGetTransactionCostMutateAsync;
};

/**
 * A custom hook for getting transaction costs.
 *
 * This hook provides functionality to get gas costs for transactions using the smart account client.
 * It can handle both single transactions and batched transactions.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useGetTransactionCost } from "@/hooks/useGetTransactionCost";
 * import { parseEther, type Address } from "viem";
 *
 * export const TransactionCost = () => {
 *   const { getTransactionCost, getTransactionCostAsync, isPending, isError, error, isSuccess, data } = useGetTransactionCost();
 *
 *   const handleGetCost = async () => {
 *     try {
 *       // Example of getting cost for a single transaction
 *       const singleTxCost = await getTransactionCostAsync({
 *         transactions: {
 *           to: "0x..." as Address,
 *           value: parseEther("0.1"),
 *           data: "0x",
 *         }
 *       });
 *       console.log("Transaction cost:", singleTxCost.totalGasCost);
 *
 *       // Example of getting cost for multiple transactions
 *       const batchTxCost = await getTransactionCostAsync({
 *         transactions: [
 *           {
 *             to: "0x..." as Address,
 *             value: parseEther("0.1"),
 *             data: "0x",
 *           },
 *           {
 *             to: "0x..." as Address,
 *             value: parseEther("0.2"),
 *             data: "0x",
 *           }
 *         ]
 *       });
 *       console.log("Batch transaction cost:", batchTxCost.totalGasCost);
 *     } catch (error) {
 *       console.error("Error getting transaction cost:", error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleGetCost} disabled={isPending}>
 *         Get Transaction Cost
 *       </button>
 *       {isError && <p>Error: {(error as Error).message}</p>}
 *       {isSuccess && <p>Transaction cost: {data?.toString()} wei</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `data`: The total transaction cost in wei (as bigint)
 * - `error`: Any error that occurred during cost calculation
 * - `isPending`: Whether the calculation is in progress
 * - `isSuccess`: Whether the calculation was successful
 * - `isError`: Whether an error occurred
 * - `getTransactionCost`: A function to trigger cost calculation without waiting for the result
 * - `getTransactionCostAsync`: A function to trigger cost calculation and wait for the result
 */
export const useGetTransactionCost = (
    mutationProps?: MutationOptionsWithoutMutationFn
): UseGetTransactionCostReturn => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async (variables: UseGetTransactionCostProps) => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }

                const { transactions } = variables;

                const userOperation =
                    await smartAccountClient.account.buildUserOperation(
                        transactions
                    );

                const estimateGas = await smartAccountClient.estimateGas({
                    userOperation,
                });

                const totalGas =
                    estimateGas.preVerificationGas +
                    estimateGas.verificationGasLimit +
                    estimateGas.callGasLimit;

                return { totalGasCost: totalGas * estimateGas.maxFeePerGas };
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        data: result.data?.totalGasCost,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        getTransactionCost: mutate,
        getTransactionCostAsync: mutateAsync,
    };
};
