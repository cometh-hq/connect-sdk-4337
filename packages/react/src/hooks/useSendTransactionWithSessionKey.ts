import { useSmartAccount } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn, Transaction } from "./types";

/**
 * Props for the useSendTransactionWithSessionKey hook.
 * @property {Transaction | Transaction[]} transactions - A single transaction or an array of transactions to send using a session key.
 */
export type UseSendTransactionWithSessionKeyProps = {
    transactions: Transaction | Transaction[];
};

/**
 * Type for the sendTransaction function.
 * This function doesn't return a promise, suitable for fire-and-forget usage.
 */
export type SendTransactionWithSessionKeyMutate = (
    variables: UseSendTransactionWithSessionKeyProps
) => void;

/**
 * Type for the sendTransactionAsync function.
 * This function returns a promise that resolves to the transaction hash.
 */
export type SendTransactionWithSessionKeyMutateAsync = (
    variables: UseSendTransactionWithSessionKeyProps
) => Promise<Hash>;

/**
 * A custom hook for sending transactions through a smart account using a session key.
 *
 * This hook provides functionality to send either a single transaction or multiple transactions
 * in batch using a session key. It uses the smart account client to process and send these transactions.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useSendTransactionWithSessionKey } from "@/hooks/useSendTransactionWithSessionKey";
 * import { useState } from "react";
 * import { parseEther, Address } from "viem";
 *
 * export const SessionKeyTransactionSender = () => {
 *   const { sendTransaction, sendTransactionAsync, isLoading, isError, error, isSuccess, data } = useSendTransactionWithSessionKey();
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
 *   const handleSendTransactionAsync = async () => {
 *     if (recipient) {
 *       try {
 *         const hash = await sendTransactionAsync({
 *           transactions: {
 *             to: recipient,
 *             value: parseEther(amount),
 *             data: "0x",
 *           }
 *         });
 *         console.log("Transaction sent with session key! Hash:", hash);
 *       } catch (error) {
 *         console.error("Error sending transaction with session key:", error);
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
 *         Send Transaction with Session Key
 *       </button>
 *       <button onClick={handleSendTransactionAsync} disabled={isLoading}>
 *         Send Transaction Async with Session Key
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
 * - `sendTransaction`: A function to trigger the transaction sending with session key without waiting for the result.
 * - `sendTransactionAsync`: A function to trigger the transaction sending with session key and wait for the result.
 *
 * @throws {Error} If no smart account is found when trying to send a transaction.
 */
export const useSendTransactionWithSessionKey = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    // Get the smart account client and query client from the useSmartAccount hook
    const { smartAccountClient, queryClient } = useSmartAccount();

    // Create a mutation using @tanstack/react-query
    const { mutate, mutateAsync, ...result } = useMutation(
        {
            // Define the mutation function
            mutationFn: (
                variables: UseSendTransactionWithSessionKeyProps
            ): Promise<Hash> => {
                // Check if the smart account client exists
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { transactions } = variables;

                // If transactions is not an array, it's a single transaction
                if (!Array.isArray(transactions)) {
                    return smartAccountClient.sendTransactionWithSessionKey(
                        transactions
                    );
                }
                // If it's an array, send multiple transactions
                return smartAccountClient.sendTransactionsWithSessionKey({
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
