import { useSmartAccount } from "@/hooks";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import type { Address, Hash, Hex } from "viem";

export type MutationOptionsWithoutMutationFn = Omit<
    UseMutationOptions<any, any, any, any>,
    "mutationFn" | "mutationKey"
>;

type Transaction = {
    to: Address;
    value: bigint;
    data: Hex;
};

export type UseSendTransactionProps = {
    transactions: Transaction;
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

                return smartAccountClient.sendTransaction(transactions);
            },
            ...mutationProps,
        },
        queryClient
    );

    return useSendTransactionMutation;
};
