import { useSmartAccount } from "@/hooks";
import type { AddSessionKeyParams, Session } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import type { UseQueryParameters } from "wagmi/query";
import type { MutationOptionsWithoutMutationFn } from "./types";

/**
 * @description A custom hook for adding a session key to a smart account.
 * 
 * This hook provides functionality to add a new session key to the user's smart account.
 * It returns both the mutation object and a dedicated function for adding the session key.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useAddSessionKey } from "@/hooks/sessionKeys";
 * import { Address } from "viem";
 *
 * export const AddSessionKeyComponent = () => {
 *   const { addSessionKey, isLoading, error, data } = useAddSessionKey();
 *
 *   const handleAddSessionKey = async () => {
 *     try {
 *       const hash = await addSessionKey({
 *         validAfter: new Date(),
 *         validUntil: new Date(Date.now() + 86400000), // 24 hours from now
 *         destinations: [] as Address[]
 *       });
 *       console.log("Session key added, transaction hash:", hash);
 *     } catch (error) {
 *       console.error("Error adding session key:", error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleAddSessionKey} disabled={isLoading}>
 *         Add Session Key
 *       </button>
 *       {isLoading && <p>Adding session key...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *       {data && <p>Session key added! Hash: {data}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `addSessionKey`: Function for adding a new session key.
 * - `isLoading`: Boolean indicating if the mutation is in progress.
 * - `error`: Any error that occurred during the mutation.
 * - `data`: The result of the mutation (transaction hash).
 * - Other properties from the useMutation hook.
 */


/**
 * @description A custom hook for adding a session key to a smart account.
 */
export const useAddSessionKey = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
        {
            mutationFn: async (params: AddSessionKeyParams): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.addSessionKey(params);
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...mutation,
        addSessionKey: mutation.mutateAsync,
    };
};

/**
 * @description A custom hook for revoking a session key from a smart account.
 */
export const useRevokeSessionKey = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
        {
            mutationFn: async (params: { sessionKey: Address }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.revokeSessionKey(params);
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...mutation,
        revokeSessionKey: mutation.mutateAsync,
    };
};

/**
 * @description A custom hook for adding a whitelist destination to a session key.
 */
export const useAddWhitelistDestination = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
        {
            mutationFn: async (params: { sessionKey: Address; destinations: Address[] }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.addWhitelistDestination(params);
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...mutation,
        addWhitelistDestination: mutation.mutateAsync,
    };
};

/**
 * @description A custom hook for removing a whitelist destination from a session key.
 */
export const useRemoveWhitelistDestination = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const mutation = useMutation(
        {
            mutationFn: async (params: { sessionKey: Address; destination: Address }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.removeWhitelistDestination(params);
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...mutation,
        removeWhitelistDestination: mutation.mutateAsync,
    };
};

/**
 * @description A custom hook for getting session information from a session key address.
 */
export const useGetSessionFromAddress = (
    sessionKey: Address,
    queryProps?: UseQueryParameters
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const query = useQuery(
        {
            queryKey: ["getSessionFromAddress", sessionKey],
            queryFn: async (): Promise<Session> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.getSessionFromAddress({ sessionKey });
            },
            ...queryProps,
        },
        queryClient
    );

    return {
        ...query,
        getSessionFromAddress: query.refetch,
    };
};

/**
 * @description A custom hook for checking if an address is a whitelisted destination for a session key.
 */
export const useIsAddressWhitelistDestination = (
    sessionKey: Address,
    targetAddress: Address,
    queryProps?: UseQueryParameters
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const query = useQuery(
        {
            queryKey: ["isAddressWhitelistDestination", sessionKey, targetAddress],
            queryFn: async (): Promise<boolean> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.isAddressWhitelistDestination({ sessionKey, targetAddress });
            },
            ...queryProps,
        },
        queryClient
    );

    return {
        ...query,
        isAddressWhitelistDestination: query.refetch,
    };
};