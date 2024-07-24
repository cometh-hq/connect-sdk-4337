import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { AddSessionKeyParams, Session } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
    UseMutationOptions,
    UseQueryOptions,
} from "@tanstack/react-query";
import type { Address, Hash } from "viem";

type AddSessionKeyParameters = AddSessionKeyParams;

type RevokeSessionKeyParameters = {
    sessionKey: Address;
};

type AddWhitelistDestinationParameters = {
    sessionKey: Address;
    destinations: Address[];
};

type RemoveWhitelistDestinationParameters = {
    sessionKey: Address;
    destination: Address;
};

/**
 * @description A custom hook for adding a session key to a smart account.
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
 * @returns An object containing the mutation function and related properties.
 */
export const useAddSessionKey = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, AddSessionKeyParameters>,
        "mutationFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async (
                params: AddSessionKeyParameters
            ): Promise<Hash> => {
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
        ...result,
        addSessionKey: mutate,
        addSessionKeyAsync: mutateAsync,
    };
};

/**
 * @description A custom hook for revoking a session key from a smart account.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useRevokeSessionKey = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, RevokeSessionKeyParameters>,
        "mutationFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async ({
                sessionKey,
            }: RevokeSessionKeyParameters): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.revokeSessionKey({
                    sessionKey,
                });
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...result,
        revokeSessionKey: mutate,
        revokeSessionKeyAsync: mutateAsync,
    };
};

/**
 * @description A custom hook for adding a whitelist destination to a session key.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useAddWhitelistDestination = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, AddWhitelistDestinationParameters>,
        "mutationFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async ({
                sessionKey,
                destinations,
            }: AddWhitelistDestinationParameters): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.addWhitelistDestination({
                    sessionKey,
                    destinations,
                });
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...result,
        addWhitelistDestination: mutate,
        addWhitelistDestinationAsync: mutateAsync,
    };
};

/**
 * @description A custom hook for removing a whitelist destination from a session key.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useRemoveWhitelistDestination = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, RemoveWhitelistDestinationParameters>,
        "mutationFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async ({
                sessionKey,
                destination,
            }: RemoveWhitelistDestinationParameters): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.removeWhitelistDestination({
                    sessionKey,
                    destination,
                });
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...result,
        removeWhitelistDestination: mutate,
        removeWhitelistDestinationAsync: mutateAsync,
    };
};

/**
 * @description A custom hook for getting session information from a session key address.
 *
 * @param sessionKey The session key address
 * @param queryProps Optional query properties from @tanstack/react-query
 *
 * @returns An object containing the query result and related properties.
 */
export const useGetSessionFromAddress = (
    sessionKey: Address,
    queryProps?: Omit<UseQueryOptions<Session, Error>, "queryKey" | "queryFn">
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    return useQuery(
        {
            queryKey: ["getSessionFromAddress", sessionKey],
            queryFn: async (): Promise<Session> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.getSessionFromAddress({
                    sessionKey,
                });
            },
            ...queryProps,
        },
        queryClient
    );
};

/**
 * @description A custom hook for checking if an address is a whitelisted destination for a session key.
 *
 * @param sessionKey The session key address
 * @param targetAddress The address to check
 * @param queryProps Optional query properties from @tanstack/react-query
 *
 * @returns An object containing the query result and related properties.
 */
export const useIsAddressWhitelistDestination = (
    sessionKey: Address,
    targetAddress: Address,
    queryProps?: Omit<UseQueryOptions<boolean, Error>, "queryKey" | "queryFn">
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    return useQuery(
        {
            queryKey: [
                "isAddressWhitelistDestination",
                sessionKey,
                targetAddress,
            ],
            queryFn: async (): Promise<boolean> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.isAddressWhitelistDestination({
                    sessionKey,
                    targetAddress,
                });
            },
            ...queryProps,
        },
        queryClient
    );
};
