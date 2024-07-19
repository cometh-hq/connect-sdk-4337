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
 *   const sendTransaction = useSendTransaction();
 *   const [recipient, setRecipient] = useState<Address>();
 *   const [amount, setAmount] = useState<string>("0");
 *
 *   const handleSendTransaction = () => {
 *     if (recipient) {
 *       sendTransaction.mutate({
 *         transactions: {
 *           to: recipient,
 *           value: parseEther(amount),
 *           data: "0x",
 *         }
 *       });
 *     }
 *   };
 *
 *   const handleSendBatchTransactions = () => {
 *     if (recipient) {
 *       sendTransaction.mutate({
 *         transactions: [
 *           {
 *             to: recipient,
 *             value: parseEther(amount),
 *             data: "0x",
 *           },
 *           {
 *             to: recipient,
 *             value: parseEther((Number(amount) * 2).toString()),
 *             data: "0x",
 *           }
 *         ]
 *       });
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
 *       <button onClick={handleSendTransaction} disabled={sendTransaction.isLoading}>
 *         Send Transaction
 *       </button>
 *       <button onClick={handleSendBatchTransactions} disabled={sendTransaction.isLoading}>
 *         Send Batch Transactions
 *       </button>
 *       {sendTransaction.isError && <p>Error: {sendTransaction.error.message}</p>}
 *       {sendTransaction.isSuccess && <p>Transaction sent! Hash: {sendTransaction.data}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns A mutation object from `@tanstack/react-query` that includes:
 * - `mutate`: Function to trigger the transaction sending.
 * - `isLoading`: Boolean indicating if the transaction is being processed.
 * - `isError`: Boolean indicating if an error occurred.
 * - `error`: Error object if an error occurred.
 * - `isSuccess`: Boolean indicating if the transaction was sent successfully.
 * - `data`: The transaction hash if the transaction was successful.
 */

export type UseSendTransactionProps = {
    transactions: Transaction | Transaction[];
};

export const useSendTransaction = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const useSendTransactionMutation = useMutation(
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

    return useSendTransactionMutation;
};
