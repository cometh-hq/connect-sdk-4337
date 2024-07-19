import { useSmartAccount } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn, Transaction } from "./types";

export type UseuseSendTransactionWithSessionKeyProps = {
    transactions: Transaction;
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
 *   const sendTransactionWithSessionKey = useSendTransactionWithSessionKey();
 *   const [recipient, setRecipient] = useState<Address>();
 *   const [amount, setAmount] = useState<string>("0");
 *
 *   const handleSendTransaction = () => {
 *     if (recipient) {
 *       sendTransactionWithSessionKey.mutate({
 *         transactions: {
 *           to: recipient,
 *           value: parseEther(amount),
 *           data: "0x",
 *         }
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
 *       <button onClick={handleSendTransaction} disabled={sendTransactionWithSessionKey.isLoading}>
 *         Send Transaction with Session Key
 *       </button>
 *       {sendTransactionWithSessionKey.isError && (
 *         <p>Error: {sendTransactionWithSessionKey.error.message}</p>
 *       )}
 *       {sendTransactionWithSessionKey.isSuccess && (
 *         <p>Transaction sent! Hash: {sendTransactionWithSessionKey.data}</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns A mutation object from `@tanstack/react-query` that includes:
 * - `mutate`: Function to trigger the transaction sending with session key.
 * - `isLoading`: Boolean indicating if the transaction is being processed.
 * - `isError`: Boolean indicating if an error occurred.
 * - `error`: Error object if an error occurred.
 * - `isSuccess`: Boolean indicating if the transaction was sent successfully.
 * - `data`: The transaction hash if the transaction was successful.
 *
 * @throws {Error} If no smart account is found when trying to send a transaction.
 */

export const useSendTransactionWithSessionKey = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const useSendTransactionWithSessionKeyMutation = useMutation(
        {
            mutationFn: (
                variables: UseuseSendTransactionWithSessionKeyProps
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

    return useSendTransactionWithSessionKeyMutation;
};
