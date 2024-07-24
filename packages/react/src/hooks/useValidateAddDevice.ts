import { useSmartAccount } from "@/hooks";
import type { Signer } from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

/**
 * Props for the useValidateAddDevice hook.
 * @property {Signer} signer - The signer to be added as a new device.
 */
export type UseValidateAddDeviceProps = {
    signer: Signer;
};

/**
 * Type for the validateAddDevice function.
 * This function doesn't return a promise, suitable for fire-and-forget usage.
 */
export type ValidateAddDeviceMutate = (
    variables: UseValidateAddDeviceProps
) => void;

/**
 * Type for the validateAddDeviceAsync function.
 * This function returns a promise that resolves to the transaction hash.
 */
export type ValidateAddDeviceMutateAsync = (
    variables: UseValidateAddDeviceProps
) => Promise<Hash>;

/**
 * A hook that validates the adding of a new device as passkey owner of the smart account.
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
 *     validateAddDeviceAsync,
 *     isLoading,
 *     error,
 *     data: transactionHash,
 *     isSuccess
 *   } = useValidateAddDevice();
 *
 *   const handleAddDevice = () => {
 *     if (signer) {
 *       validateAddDevice({ signer });
 *     }
 *   };
 *
 *   const handleAddDeviceAsync = async () => {
 *     if (signer) {
 *       try {
 *         const hash = await validateAddDeviceAsync({ signer });
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
 *       <button onClick={handleAddDeviceAsync} disabled={isLoading}>
 *         Add New Device (Async)
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
 * - `validateAddDevice`: A function to trigger the device validation without waiting for the result.
 * - `validateAddDeviceAsync`: A function to trigger the device validation and wait for the result.
 */
export const useValidateAddDevice = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    // Get the smart account client and query client from the useSmartAccount hook
    const { smartAccountClient, queryClient } = useSmartAccount();

    // Create a mutation using @tanstack/react-query
    const { mutate, mutateAsync, ...result } = useMutation(
        {
            // Define the mutation function
            mutationFn: (
                variables: UseValidateAddDeviceProps
            ): Promise<Hash> => {
                // Check if the smart account client exists
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { signer } = variables;

                return smartAccountClient.validateAddDevice({ signer });
            },
            // Spread any additional mutation options provided
            ...mutationProps,
        },
        queryClient
    );

    // Return the mutation object along with the validateAddDevice and validateAddDeviceAsync functions
    return {
        ...result,
        validateAddDevice: mutate,
        validateAddDeviceAsync: mutateAsync,
    };
};
