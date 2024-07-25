import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

/**
 * Props for the useVerifyMessage hook.
 * @property {string} message - The message to verify.
 * @property {Hex} signature - The signature to verify.
 */
export type UseVerifySignatureProps = {
    message: string;
    signature: Hex;
};

/**
 * Type for the verifyMessage function.
 * This function doesn't return a promise, suitable for fire-and-forget usage.
 */
export type VerifyMessageMutate = (variables: UseVerifySignatureProps) => void;

/**
 * Type for the verifyMessageAsync function.
 * This function returns a promise that resolves to a boolean indicating if the signature is valid.
 */
export type VerifyMessageMutateAsync = (
    variables: UseVerifySignatureProps
) => Promise<boolean>;

// Return type of the hook
export type UseVerifyMessageReturn = {
    data?: boolean;
    error: unknown; // The error object from the mutation, if any
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    verifyMessage: VerifyMessageMutate;
    verifyMessageAsync: VerifyMessageMutateAsync;
};

/**
 * A hook that verifies a message signature for the current smart account.
 *
 * This hook uses the `verifySignature` method from the smart account client to verify
 * if a given signature is valid for a specific message. It's typically used to authenticate
 * user actions or verify the integrity of signed messages.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isPending`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `verifyMessage`: A function to trigger the signature verification without waiting for the result.
 * - `verifyMessageAsync`: A function to trigger the signature verification and wait for the result.
 *
 * @throws {Error} If no smart account is found when trying to verify a signature.
 */
export const useVerifyMessage = (
    mutationProps?: MutationOptionsWithoutMutationFn
): UseVerifyMessageReturn => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
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

    return {
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        verifyMessage: mutate,
        verifyMessageAsync: mutateAsync,
    };
};
