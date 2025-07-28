import { SmartAccountNotFoundError } from "@/errors";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useMutation } from "@tanstack/react-query";
import type { Hash, Hex, SignableMessage } from "viem";
import type { QueryResultType } from "./types";

type SignMessageArgs = {
    message: SignableMessage;
};

type SignMessageMutate = (variables: SignMessageArgs) => void;
type SignMessageMutateAsync = (variables: SignMessageArgs) => Promise<Hex>;

export type UseSignMessageReturn = QueryResultType<Hash> & {
    signMessage: SignMessageMutate;
    signMessageAsync: SignMessageMutateAsync;
};

export function useSignMessage(): UseSignMessageReturn {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation<
        Hex,
        Error,
        SignMessageArgs
    >(
        {
            mutationFn: async ({ message }: SignMessageArgs): Promise<Hex> => {
                if (!smartAccountClient) {
                    throw new SmartAccountNotFoundError();
                }

                const signature = await smartAccountClient.account.signMessage({
                    message,
                });
                return signature;
            },
        },
        queryClient
    );

    return {
        signMessage: mutate,
        signMessageAsync: mutateAsync,
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
    };
}
