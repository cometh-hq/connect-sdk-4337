import { useSmartAccount } from "@/hooks/useSmartAccount";
import type {
    IsRecoveryActiveParams,
    IsRecoveryActiveReturnType,
} from "@cometh/connect-sdk-4337";
import { useQuery } from "@tanstack/react-query";

export type UseIsRecoveryActiveProps = IsRecoveryActiveParams;

export type UseIsRecoveryActiveReturn = {
    data: IsRecoveryActiveReturnType | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
};

/**
 * A custom hook for checking if recovery is active for a smart account.
 *
 * This hook provides functionality to check if a delay module is deployed
 * and retrieve the guardian address for the smart account's recovery setup.
 *
 * @param {UseIsRecoveryActiveProps} props - The properties for the hook.
 * @param {string} [props.publicClient] - Optional client for the blockchain network.
 *
 * @example
 * ```tsx
 * import { useIsRecoveryActive } from "@/hooks/useIsRecoveryActive";
 *
 * export const RecoveryStatus = () => {
 *   const { data, isLoading, isError, error } = useIsRecoveryActive();
 *
 *   if (isLoading) return <p>Loading recovery status...</p>;
 *   if (isError) return <p>Error: {error?.message}</p>;
 *
 *   return (
 *     <div>
 *       <p>Recovery Module Deployed: {data?.isDelayModuleDeployed ? 'Yes' : 'No'}</p>
 *       <p>Guardian Address: {data?.guardianAddress || 'Not set'}</p>
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `data`: The result of the recovery status check, or undefined if not yet loaded.
 * - `isLoading`: A boolean indicating if the check is in progress.
 * - `isError`: A boolean indicating if an error occurred during the check.
 * - `error`: The error object if an error occurred, null otherwise.
 */
export function useIsRecoveryActive(
    props: UseIsRecoveryActiveProps = {}
): UseIsRecoveryActiveReturn {
    const { smartAccountClient, queryClient } = useSmartAccount();

    return useQuery<IsRecoveryActiveReturnType, Error>(
        {
            queryKey: ["isRecoveryActive"],
            queryFn: async () => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }

                return smartAccountClient.isRecoveryActive(props);
            },
            enabled: !!smartAccountClient,
        },
        queryClient
    );
}
