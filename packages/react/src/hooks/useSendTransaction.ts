import { useSmartAccount } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn, Transaction } from "./types";

/**
 * @description A custom hook for sending transactions through a smart account.
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
 *   const { sendTransaction, isLoading, isError, error, isSuccess, data } = useSendTransaction();
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
 *         console.log("Transaction sent! Hash:", hash);
 *       } catch (error) {
 *         console.error("Error sending transaction:", error);
 *       }
 *     }
 *   };
 *
 *   const handleSendBatchTransactions = async () => {
 *     if (recipient) {
 *       try {
 *         const hash = await sendTransaction({
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
 * - `sendTransaction`: A function to trigger the transaction sending, which returns a promise
 *   that resolves to the transaction hash.
 */

export type UseSendTransactionProps = {
    transactions: Transaction | Transaction[];
};

export const useSendTransaction = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
        {
            mutationFn: (variables: UseSendTransactionProps): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { transactions } = variables;

                if (!Array.isArray(transactions)) {
                    return smartAccountClient.sendTransaction(transactions);
                }
                return smartAccountClient.sendTransactions({
                    transactions: transactions,
                });
            },
            ...mutationProps,
        },
        queryClient
    );

    const sendTransaction = async (variables: UseSendTransactionProps): Promise<Hash> => {
        return mutation.mutateAsync(variables);
    };

    return {
        ...mutation,
        sendTransaction,
    };
};