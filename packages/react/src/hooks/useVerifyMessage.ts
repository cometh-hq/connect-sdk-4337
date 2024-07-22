import { useSmartAccount } from "@/hooks";
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

/**
 * A hook that verifies a message signature for the current smart account.
 *
 * This hook uses the `verifySignature` method from the smart account client to verify
 * if a given signature is valid for a specific message. It's typically used to authenticate
 * user actions or verify the integrity of signed messages.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useVerifyMessage } from "@/hooks/useVerifyMessage";
 * import { useState } from "react";
 *
 * export const VerifySignature = () => {
 *   const [message, setMessage] = useState("");
 *   const [signature, setSignature] = useState("");
 *   const {
 *     verifyMessage,
 *     verifyMessageAsync,
 *     isLoading,
 *     error,
 *     data: isValid,
 *     isSuccess
 *   } = useVerifyMessage();
 *
 *   const handleVerify = () => {
 *     verifyMessage({ message, signature: signature as Hex });
 *   };
 *
 *   const handleVerifyAsync = async () => {
 *     try {
 *       const result = await verifyMessageAsync({ message, signature: signature as Hex });
 *       console.log("Signature verification result:", result);
 *     } catch (error) {
 *       console.error("Error verifying signature:", error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         value={message}
 *         onChange={(e) => setMessage(e.target.value)}
 *         placeholder="Message"
 *       />
 *       <input
 *         value={signature}
 *         onChange={(e) => setSignature(e.target.value)}
 *         placeholder="Signature (Hex)"
 *       />
 *       <button onClick={handleVerify} disabled={isLoading}>
 *         Verify Signature
 *       </button>
 *       <button onClick={handleVerifyAsync} disabled={isLoading}>
 *         Verify Signature (Async)
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *       {isSuccess && (
 *         <p>Signature is {isValid ? "valid" : "invalid"}</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isLoading`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `verifyMessage`: A function to trigger the signature verification without waiting for the result.
 * - `verifyMessageAsync`: A function to trigger the signature verification and wait for the result.
 */
export const useVerifyMessage = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    // Get the smart account client and query client from the useSmartAccount hook
    const { smartAccountClient, queryClient } = useSmartAccount();

    // Create a mutation using @tanstack/react-query
    const { mutate, mutateAsync, ...result } = useMutation(
        {
            // Define the mutation function
            mutationFn: async (
                variables: UseVerifySignatureProps
            ): Promise<boolean> => {
                // Check if the smart account client exists
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { message, signature } = variables;

                return smartAccountClient.verifySignature({
                    message,
                    signature,
                });
            },
            // Spread any additional mutation options provided
            ...mutationProps,
        },
        queryClient
    );

    // Return the mutation object along with the verifyMessage and verifyMessageAsync functions
    return {
        ...result,
        verifyMessage: mutate,
        verifyMessageAsync: mutateAsync,
    };
};
