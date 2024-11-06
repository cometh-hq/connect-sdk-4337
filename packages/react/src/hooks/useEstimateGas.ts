import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useMutation } from "@tanstack/react-query";
import type { MutationOptionsWithoutMutationFn, Transaction } from "./types";

/**
 * Props for the useEstimateGas hook.
 * @property {Transaction | Transaction[]} transactions - A single transaction or an array of transactions to estimate gas for.
 */
export type UseEstimateGasProps = {
    transactions: Transaction | Transaction[];
};

/**
 * Gas estimation result type
 */
export type GasEstimationResult = {
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
};

/**
 * Type for the estimateGas function.
 * This function doesn't return a promise, suitable for fire-and-forget usage.
 */
export type EstimateGasMutate = (variables: UseEstimateGasProps) => void;

/**
 * Type for the estimateGasAsync function.
 * This function returns a promise that resolves to the detailed gas estimation.
 */
export type EstimateGasMutateAsync = (
    variables: UseEstimateGasProps
) => Promise<GasEstimationResult>;

// Return type of the hook
export type UseEstimateGasReturn = {
    data?: GasEstimationResult;
    error: unknown;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    estimateGas: EstimateGasMutate;
    estimateGasAsync: EstimateGasMutateAsync;
};

/**
 * A custom hook for estimating detailed gas parameters for transactions.
 *
 * This hook provides functionality to estimate various gas parameters for transactions
 * using the smart account client. It can handle both single transactions and batched transactions.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useEstimateGas } from "@/hooks/useEstimateGas";
 * import { parseEther, type Address } from "viem";
 *
 * export const GasEstimator = () => {
 *   const { estimateGas, estimateGasAsync, isPending, isError, error, isSuccess, data } = useEstimateGas();
 *
 *   const handleEstimateGas = async () => {
 *     try {
 *       // Example of estimating gas for a single transaction
 *       const singleTxEstimate = await estimateGasAsync({
 *         transactions: {
 *           to: "0x..." as Address,
 *           value: parseEther("0.1"),
 *           data: "0x",
 *         }
 *       });
 *       console.log("Gas limits:", {
 *         callGas: singleTxEstimate.callGasLimit.toString(),
 *         verificationGas: singleTxEstimate.verificationGasLimit.toString(),
 *         preVerificationGas: singleTxEstimate.preVerificationGas.toString(),
 *       });
 *
 *       // Example of estimating gas for multiple transactions
 *       const batchTxEstimate = await estimateGasAsync({
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
 *       console.log("Batch transaction gas parameters:", batchTxEstimate);
 *     } catch (error) {
 *       console.error("Error estimating gas:", error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleEstimateGas} disabled={isPending}>
 *         Estimate Gas Parameters
 *       </button>
 *       {isError && <p>Error: {(error as Error).message}</p>}
 *       {isSuccess && data && (
 *         <div>
 *           <p>Call Gas Limit: {data.callGasLimit.toString()}</p>
 *           <p>Verification Gas Limit: {data.verificationGasLimit.toString()}</p>
 *           <p>Pre-verification Gas: {data.preVerificationGas.toString()}</p>
 *           <p>Max Fee Per Gas: {data.maxFeePerGas.toString()}</p>
 *           <p>Max Priority Fee Per Gas: {data.maxPriorityFeePerGas.toString()}</p>
 *         </div>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `data`: Detailed gas estimation parameters including various gas limits and fees
 * - `error`: Any error that occurred during estimation
 * - `isPending`: Whether the estimation is in progress
 * - `isSuccess`: Whether the estimation was successful
 * - `isError`: Whether an error occurred
 * - `estimateGas`: A function to trigger gas estimation without waiting for the result
 * - `estimateGasAsync`: A function to trigger gas estimation and wait for the result
 */
export const useEstimateGas = (
    mutationProps?: MutationOptionsWithoutMutationFn
): UseEstimateGasReturn => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async (variables: UseEstimateGasProps) => {
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

                return estimateGas;
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        estimateGas: mutate,
        estimateGasAsync: mutateAsync,
    };
};
