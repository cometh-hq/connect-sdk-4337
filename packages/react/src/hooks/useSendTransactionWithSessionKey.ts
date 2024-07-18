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

                return smartAccountClient.sendTransactionWithSessionKey(
                    transactions
                );
            },
            ...mutationProps,
        },
        queryClient
    );

    return useSendTransactionWithSessionKeyMutation;
};
