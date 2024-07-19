import { useSmartAccount } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn, Transaction } from "./types";

export type UseSendTransactionWithSessionKeyProps = {
    transactions: Transaction | Transaction[];
};

/**
 * @description A custom hook for sending transactions through a smart account using a session key.
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
 *   const { sendTransaction, isLoading, isError, error, isSuccess, data } = useSendTransactionWithSessionKey();
 *   const [recipient, setRecipient] = useState<Address>();
 *   const [amount, setAmount] = useState<string>("0");
 *
 *   const handleSendTransaction = async () => {
 *     if (recipient) {
 *       try {
 *         const hash = await sendTransaction({
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
 *       {isError && <p>Error: {error.message}</p>}
 *       {isSuccess && <p>Transaction sent! Hash: {data}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isLoading`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `sendTransaction`: A function to trigger the transaction sending with session key, which returns a promise
 *   that resolves to the transaction hash.
 *
 * @throws {Error} If no smart account is found when trying to send a transaction.
 */

export const useSendTransactionWithSessionKey = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
        {
            mutationFn: (
                variables: UseSendTransactionWithSessionKeyProps
            ): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { transactions } = variables;

                if (!Array.isArray(transactions)) {
                    return smartAccountClient.sendTransactionWithSessionKey(
                        transactions
                    );
                }
                return smartAccountClient.sendTransactionsWithSessionKey({
                    transactions: transactions,
                });
            },
            ...mutationProps,
        },
        queryClient
    );

    const sendTransaction = async (variables: UseSendTransactionWithSessionKeyProps): Promise<Hash> => {
        return mutation.mutateAsync(variables);
    };

    return {
        ...mutation,
        sendTransaction,
    };
};