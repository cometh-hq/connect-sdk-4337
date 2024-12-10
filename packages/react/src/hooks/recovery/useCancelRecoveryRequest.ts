import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { CancelRecoveryRequestParams } from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { QueryResultType } from "../types";

export type UseCancelRecoveryRequestProps = CancelRecoveryRequestParams;

export type CancelRecoveryRequestMutate = (
    variables: UseCancelRecoveryRequestProps
) => void;

export type CancelRecoveryRequestMutateAsync = (
    variables: UseCancelRecoveryRequestProps
) => Promise<Hex>;

export type UseCancelRecoveryRequestReturn = QueryResultType & {
    cancelRecoveryRequest: CancelRecoveryRequestMutate;
    cancelRecoveryRequestAsync: CancelRecoveryRequestMutateAsync;
};

/**
 * A custom hook for canceling a recovery request for a smart account.
 *
 * This hook provides functionality to cancel an active recovery request
 * for a smart account. It uses the smart account client to process and send
 * the required transaction to cancel the recovery process.
 *
 * @template entryPoint - The type of EntryPoint used in the smart account.
 *
 * @example
 * ```tsx
 * import { useCancelRecoveryRequest } from "@/hooks/useCancelRecoveryRequest";
 *
 * export const CancelRecoveryButton = () => {
 *   const {
 *     cancelRecoveryRequest,
 *     cancelRecoveryRequestAsync,
 *     isLoading,
 *     isError,
 *     error,
 *     isSuccess,
 *     data
 *   } = useCancelRecoveryRequest();
 *
 *   const handleCancel = async () => {
 *     try {
 *       const result = await cancelRecoveryRequestAsync({
 *         rpcUrl: 'https://my-rpc-url.com',
 *         // other necessary parameters
 *       });
 *       console.log('Recovery request canceled successfully:', result);
 *     } catch (error) {
 *       console.error('Error canceling recovery request:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleCancel} disabled={isLoading}>
 *         Cancel Recovery Request
 *       </button>
 *       {isLoading && <p>Canceling recovery request...</p>}
 *       {isError && <p>Error: {error?.message}</p>}
 *       {isSuccess && <p>Recovery request canceled successfully. Hash: {data}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `cancelRecoveryRequest`: A function to trigger the cancellation without waiting for the result.
 * - `cancelRecoveryRequestAsync`: A function to trigger the cancellation and wait for the result.
 * - `isLoading`: A boolean indicating if the cancellation is in progress.
 * - `isError`: A boolean indicating if an error occurred during cancellation.
 * - `error`: The error object if an error occurred, null otherwise.
 * - `isSuccess`: A boolean indicating if the cancellation was successful.
 * - `data`: The transaction hash (Hex) returned after successful cancellation.
 */
export function useCancelRecoveryRequest(): UseCancelRecoveryRequestReturn {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async (
                variables: UseCancelRecoveryRequestProps
            ): Promise<Hex> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }

                return smartAccountClient.cancelRecoveryRequest({
                    rpcUrl: variables.rpcUrl,
                });
            },
        },
        queryClient
    );

    return {
        cancelRecoveryRequest: mutate,
        cancelRecoveryRequestAsync: mutateAsync,
        isPending: result.isPending,
        isError: result.isError,
        error: result.error,
        isSuccess: result.isSuccess,
        data: result.data,
    };
}
