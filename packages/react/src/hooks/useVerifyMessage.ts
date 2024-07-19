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
 * Mutation function args: {@link UseVerifySignatureProps}
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
 *     mutate: verifyMessage,
 *     isLoading,
 *     error,
 *     data: isValid
 *   } = useVerifyMessage();
 *
 *   const handleVerify = () => {
 *     verifyMessage({ message, signature: signature as Hex });
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
 *       {isValid !== undefined && (
 *         <p>Signature is {isValid ? "valid" : "invalid"}</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 * @returns A mutation object from `@tanstack/react-query` that includes the mutate function,
 * loading state, error state, and the resulting boolean indicating if the signature is valid.
 */

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
