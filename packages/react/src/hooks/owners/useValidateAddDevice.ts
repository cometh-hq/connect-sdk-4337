import { SmartAccountNotFoundError } from "@/errors";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { Signer } from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type {
    MutationOptionsWithoutMutationFn,
    QueryResultType,
} from "./../types";

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

// Return type of the hook
export type UseValidateAddDeviceReturn = QueryResultType<Hash> & {
    validateAddDevice: ValidateAddDeviceMutate;
    validateAddDeviceAsync: ValidateAddDeviceMutateAsync;
};

/**
 * A hook that validates the adding of a new device as passkey owner of the smart account.
 *
 * This hook uses the `validateAddDevice` method from the smart account client to add a new signer
 * to the user's account. It's typically used in the process of adding a new device or recovery method
 * to a user's account.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isPending`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `validateAddDevice`: A function to trigger the device validation without waiting for the result.
 * - `validateAddDeviceAsync`: A function to trigger the device validation and wait for the result.
 *
 * @throws {Error} If no smart account is found when trying to validate adding a device.
 */
export const useValidateAddDevice = (
    mutationProps?: MutationOptionsWithoutMutationFn
): UseValidateAddDeviceReturn => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: (
                variables: UseValidateAddDeviceProps
            ): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new SmartAccountNotFoundError();
                }
                const { signer } = variables;

                return smartAccountClient.validateAddDevice({ signer });
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
        validateAddDevice: mutate,
        validateAddDeviceAsync: mutateAsync,
    };
};
