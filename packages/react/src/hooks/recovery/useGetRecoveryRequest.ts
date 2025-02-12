import { SmartAccountNotFoundError } from "@/errors";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import type {
    GetRecoveryRequestParams,
    RecoveryParamsResponse,
} from "@cometh/connect-sdk-4337";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";

export type UseGetRecoveryRequestProps = GetRecoveryRequestParams;

export type UseGetRecoveryRequestReturn = {
    data: RecoveryParamsResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
};

/**
 * A custom hook for getting the recovery request for a smart account.
 *
 * This hook provides functionality to check if a recovery request is active
 * and retrieve the details of the recovery request if one exists.
 *
 * @param {UseGetRecoveryRequestProps} props - The properties for the hook.
 * @param {string} [props.publicClient] - Optional client for the blockchain network.
 * @param {UseQueryOptions} [queryOptions] - Optional configuration for the React Query hook.
 *
 * @example
 * ```tsx
 * import { useGetRecoveryRequest } from "@/hooks/useGetRecoveryRequest";
 *
 * export const RecoveryRequestStatus = () => {
 *   const { data, isLoading, isError, error } = useGetRecoveryRequest();
 *
 *   if (isLoading) return <p>Loading recovery request status...</p>;
 *   if (isError) return <p>Error: {error?.message}</p>;
 *
 *   return (
 *     <div>
 *       {data ? (
 *         <>
 *           <p>Recovery Request Active</p>
 *           <p>New Owner: {data.newOwner}</p>
 *           <p>Execution Time: {new Date(data.executionTime * 1000).toLocaleString()}</p>
 *         </>
 *       ) : (
 *         <p>No active recovery request</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `data`: The recovery request details, or undefined if no request is active or not yet loaded.
 * - `isLoading`: A boolean indicating if the check is in progress.
 * - `isError`: A boolean indicating if an error occurred during the check.
 * - `error`: The error object if an error occurred, null otherwise.
 * - `refetch`: A function to manually trigger a refetch of the recovery request status.
 */
export function useGetRecoveryRequest(
    props: UseGetRecoveryRequestProps = {},
    queryOptions?: Omit<
        UseQueryOptions<RecoveryParamsResponse | undefined, Error>,
        "queryKey" | "queryFn"
    >
): UseGetRecoveryRequestReturn {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { data, isLoading, isError, error } = useQuery<
        RecoveryParamsResponse | undefined,
        Error
    >(
        {
            queryKey: ["getRecoveryRequest"],
            queryFn: async () => {
                if (!smartAccountClient) {
                    throw new SmartAccountNotFoundError();
                }

                return smartAccountClient.getRecoveryRequest(props);
            },
            enabled: !!smartAccountClient,
            ...queryOptions,
        },
        queryClient
    );

    return {
        data,
        isLoading,
        isError,
        error,
    };
}
