import { useSmartAccount } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Address, Hash, Hex } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

type Transaction = {
    to: Address;
    value: bigint;
    data: Hex;
};

export type UseuseSendTransactionWithSessionKeyProps = {
    transactions: Transaction;
};

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
