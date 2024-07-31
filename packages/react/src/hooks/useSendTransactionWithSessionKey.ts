import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type {
    MutationOptionsWithoutMutationFn,
    QueryResultType,
    Transaction,
} from "./types";

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

// Return type of the hook
export type UseSendTransactionWithSessionKeyReturn = QueryResultType & {
    sendTransaction: SendTransactionWithSessionKeyMutate;
    sendTransactionAsync: SendTransactionWithSessionKeyMutateAsync;
};

/**
 * A custom hook for sending transactions through a smart account using a session key.
 *
 * This hook provides functionality to send either a single transaction or multiple transactions
 * in batch using a session key. It uses the smart account client to process and send these transactions.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isPending`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `sendTransaction`: A function to trigger the transaction sending with session key without waiting for the result.
 * - `sendTransactionAsync`: A function to trigger the transaction sending with session key and wait for the result.
 *
 * @throws {Error} If no smart account is found when trying to send a transaction.
 */
export const useSendTransactionWithSessionKey = (
    mutationProps?: MutationOptionsWithoutMutationFn
): UseSendTransactionWithSessionKeyReturn => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
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

    return {
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        sendTransaction: mutate,
        sendTransactionAsync: mutateAsync,
    };
};
