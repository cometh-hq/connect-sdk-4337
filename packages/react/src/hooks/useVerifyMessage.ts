import { useSmartAccount } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

export type UseVerifySignatureProps = {
    message: string;
    signature: Hex;
};

/**
 * @description A hook that verifies a message signature for the current smart account.
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
 *     isLoading,
 *     error,
 *     data: isValid,
 *     isSuccess
 *   } = useVerifyMessage();
 *
 *   const handleVerify = async () => {
 *     try {
 *       const result = await verifyMessage({ message, signature: signature as Hex });
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
 * - `verifyMessage`: A function to trigger the signature verification, which returns a promise
 *   that resolves to a boolean indicating if the signature is valid.
 */

export const useVerifyMessage = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
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

    const verifyMessage = async (
        variables: UseVerifySignatureProps
    ): Promise<boolean> => {
        return mutation.mutateAsync(variables);
    };

    return {
        ...mutation,
        verifyMessage,
    };
};
