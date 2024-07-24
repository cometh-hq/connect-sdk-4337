import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn, Transaction } from "./types";

/**
 * Props for the useSendTransaction hook.
 * @property {Transaction | Transaction[]} transactions - A single transaction or an array of transactions to send.
 */
export type UseSendTransactionProps = {
    transactions: Transaction | Transaction[];
};

/**
 * Type for the sendTransaction function.
 * This function doesn't return a promise, suitable for fire-and-forget usage.
 */
export type SendTransactionMutate = (
    variables: UseSendTransactionProps
) => void;

/**
 * Type for the sendTransactionAsync function.
 * This function returns a promise that resolves to the transaction hash.
 */
export type SendTransactionMutateAsync = (
    variables: UseSendTransactionProps
) => Promise<Hash>;

/**
 * A custom hook for sending transactions through a smart account.
 *
 * This hook provides functionality to send either a single transaction or multiple transactions
 * in batch. It uses the smart account client to process and send these transactions.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useSendTransaction } from "@/hooks/useSendTransaction";
 * import { useState } from "react";
 * import { parseEther, Address } from "viem";
 *
 * export const TransactionSender = () => {
 *   const { sendTransaction, sendTransactionAsync, isLoading, isError, error, isSuccess, data } = useSendTransaction();
 *   const [recipient, setRecipient] = useState<Address>();
 *   const [amount, setAmount] = useState<string>("0");
 *
 *   const handleSendTransaction = () => {
 *     if (recipient) {
 *       sendTransaction({
 *         transactions: {
 *           to: recipient,
 *           value: parseEther(amount),
 *           data: "0x",
 *         }
 *       });
 *     }
 *   };
 *
 *   const handleSendBatchTransactions = async () => {
 *     if (recipient) {
 *       try {
 *         const hash = await sendTransactionAsync({
 *           transactions: [
 *             {
 *               to: recipient,
 *               value: parseEther(amount),
 *               data: "0x",
 *             },
 *             {
 *               to: recipient,
 *               value: parseEther((Number(amount) * 2).toString()),
 *               data: "0x",
 *             }
 *           ]
 *         });
 *         console.log("Batch transactions sent! Hash:", hash);
 *       } catch (error) {
 *         console.error("Error sending batch transactions:", error);
 *       }
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         placeholder="Recipient address"
 *         onChange={(e) => setRecipient(e.target.value as Address)}
 *       />
 *       <input
 *         type="number"
 *         placeholder="Amount in ETH"
 *         onChange={(e) => setAmount(e.target.value)}
 *       />
 *       <button onClick={handleSendTransaction} disabled={isLoading}>
 *         Send Transaction
 *       </button>
 *       <button onClick={handleSendBatchTransactions} disabled={isLoading}>
 *         Send Batch Transactions
 *       </button>
 *       {isError && <p>Error: {error.message}</p>}
 *       {isSuccess && <p>Transaction sent! Hash: {data}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isLoading`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `sendTransaction`: A function to trigger the transaction sending without waiting for the result.
 * - `sendTransactionAsync`: A function to trigger the transaction sending and wait for the result.
 */
export const useSendTransaction = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    // Get the smart account client and query client from the useSmartAccount hook
    const { smartAccountClient, queryClient } = useSmartAccount();

    // Create a mutation using @tanstack/react-query
    const { mutate, mutateAsync, ...result } = useMutation(
        {
            // Define the mutation function
            mutationFn: (variables: UseSendTransactionProps): Promise<Hash> => {
                // Check if the smart account client exists
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { transactions } = variables;

                // If transactions is not an array, it's a single transaction
                if (!Array.isArray(transactions)) {
                    return smartAccountClient.sendTransaction(transactions);
                }
                // If it's an array, send multiple transactions
                return smartAccountClient.sendTransactions({
                    transactions: transactions,
                });
            },
            // Spread any additional mutation options provided
            ...mutationProps,
        },
        queryClient
    );

    // Return the mutation object along with the sendTransaction and sendTransactionAsync functions
    return {
        ...result,
        sendTransaction: mutate,
        sendTransactionAsync: mutateAsync,
    };
};
