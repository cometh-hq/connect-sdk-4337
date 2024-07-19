import { useSmartAccount } from "@/hooks";
import type { Signer } from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

export type UseValidateAddDeviceProps = {
    signer: Signer;
};

/**
 * @description A hook that validates the adding of a new device ass passkey owner of the smart account.
 *
 * This hook uses the `validateAddDevice` method from the smart account client to add a new signer
 * to the user's account. It's typically used in the process of adding a new device or recovery method
 * to a user's account.
 *
 * Mutation function args: {@link UseValidateAddDeviceProps}
 *
 * @example
 * ```tsx
 * import { useValidateAddDevice } from "@/hooks/useValidateAddDevice";
 *
 * export const AddNewDevice = () => {
 *   const signer = signerPayload
 *
 *   const {
 *     mutate: validateAddDevice,
 *     isLoading,
 *     error,
 *     data: transactionHash
 *   } = useValidateAddDevice();
 *
 *   const handleAddDevice = () => {
 *     if (signer) {
 *       validateAddDevice({ signer });
 *     }
 *   };
 *
 *   useEffect(() => {
 *     if (transactionHash) {
 *       console.log("New device added. Transaction hash:", transactionHash);
 *     }
 *   }, [transactionHash]);
 *
 *   return (
 *     <div>
 *       <button onClick={handleAddDevice} disabled={isLoading}>
 *         Add New Device
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *       {transactionHash && <p>Device added successfully!</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns A mutation object from `@tanstack/react-query` that includes the mutate function,
 * loading state, error state, and the resulting transaction hash.
 */

export const useValidateAddDevice = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const useValidateAddDeviceMutation = useMutation(
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

    return useValidateAddDeviceMutation;
};
