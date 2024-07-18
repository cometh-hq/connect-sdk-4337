import { useSmartAccount } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

export type UseVerifySignatureProps = {
    message: string;
    signature: Hex;
};

export const useVerifyMessage = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const useVerifySignatureMutation = useMutation(
        {
            mutationFn: async (
                variables: UseVerifySignatureProps
            ): Promise<boolean> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { message, signature } = variables;

                return smartAccountClient.verifySignature({
                    message,
                    signature,
                });
            },
            ...mutationProps,
        },
        queryClient
    );

    return useVerifySignatureMutation;
};
