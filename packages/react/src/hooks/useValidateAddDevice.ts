import { useSmartAccount } from "@/hooks";
import type { Signer } from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

export type UseValidateAddDeviceProps = {
    signer: Signer;
};

/**
 * @description A hook that validates the adding of a new device as passkey owner of the smart account.
 *
 * This hook uses the `validateAddDevice` method from the smart account client to add a new signer
 * to the user's account. It's typically used in the process of adding a new device or recovery method
 * to a user's account.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useValidateAddDevice } from "@/hooks/useValidateAddDevice";
 *
 * export const AddNewDevice = () => {
 *   const signer = signerPayload;
 *   const {
 *     validateAddDevice,
 *     isLoading,
 *     error,
 *     data: transactionHash,
 *     isSuccess
 *   } = useValidateAddDevice();
 *
 *   const handleAddDevice = async () => {
 *     if (signer) {
 *       try {
 *         const hash = await validateAddDevice({ signer });
 *         console.log("New device added. Transaction hash:", hash);
 *       } catch (error) {
 *         console.error("Error adding device:", error);
 *       }
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleAddDevice} disabled={isLoading}>
 *         Add New Device
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *       {isSuccess && <p>Device added successfully! Hash: {transactionHash}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isLoading`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `validateAddDevice`: A function to trigger the device validation, which returns a promise
 *   that resolves to the transaction hash.
 */

export const useValidateAddDevice = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
        {
            mutationFn: (
                variables: UseValidateAddDeviceProps
            ): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { signer } = variables;

                return smartAccountClient.validateAddDevice({ signer });
            },
            ...mutationProps,
        },
        queryClient
    );

    const validateAddDevice = async (
        variables: UseValidateAddDeviceProps
    ): Promise<Hash> => {
        return mutation.mutateAsync(variables);
    };

    return {
        ...mutation,
        validateAddDevice,
    };
};
