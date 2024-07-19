import { useSmartAccount } from "@/hooks";
import type { AddSessionKeyParams, Session } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import type { UseQueryParameters } from "wagmi/query";
import type { MutationOptionsWithoutMutationFn } from "./types";

/**
 * @description A custom hook for managing session keys and their associated operations.
 *
 * This hook provides a set of mutation and query functions to interact with session keys
 * in a smart account context. It includes operations for adding and revoking session keys,
 * managing whitelist destinations, and querying session information.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 * @param queryProps Optional query properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useSessionKeys } from "@/hooks/useSessionKeys";
 * import { useState } from "react";
 * import { Address } from "viem";
 *
 * export const SessionKeyManager = () => {
 *   const {
 *     addSessionKeyMutation,
 *     revokeSessionKeyMutation,
 *     addWhitelistDestinationMutation,
 *     removeWhitelistDestinationMutation,
 *     useGetSessionFromAddress,
 *     useIsAddressWhitelistDestination
 *   } = useSessionKeys();
 *
 *   const [sessionKey, setSessionKey] = useState<Address>();
 *   const [destination, setDestination] = useState<Address>();
 *
 *   const { data: sessionData } = useGetSessionFromAddress(sessionKey);
 *   const { data: isWhitelisted } = useIsAddressWhitelistDestination(sessionKey, destination);
 *
 *   const handleAddSessionKey = () => {
 *     addSessionKeyMutation.mutate({
 *       validAfter: new Date(),
 *       validUntil: new Date(Date.now() + 86400000), // 24 hours from now
 *       destinations: []
 *     });
 *   };
 *
 *   const handleRevokeSessionKey = () => {
 *     if (sessionKey) {
 *       revokeSessionKeyMutation.mutate({ sessionKey });
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleAddSessionKey}>Add Session Key</button>
 *       <button onClick={handleRevokeSessionKey}>Revoke Session Key</button>
 *       {sessionData && <p>Session Key: {sessionData.sessionKey}</p>}
 *       {isWhitelisted !== undefined && (
 *         <p>Is Destination Whitelisted: {isWhitelisted ? "Yes" : "No"}</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `addSessionKeyMutation`: Mutation for adding a new session key.
 * - `revokeSessionKeyMutation`: Mutation for revoking an existing session key.
 * - `addWhitelistDestinationMutation`: Mutation for adding a whitelist destination to a session key.
 * - `removeWhitelistDestinationMutation`: Mutation for removing a whitelist destination from a session key.
 * - `useGetSessionFromAddress`: Query hook for getting session information from a session key address.
 * - `useIsAddressWhitelistDestination`: Query hook for checking if an address is a whitelisted destination for a session key.
 *
 * Each mutation and query function adheres to the react-query API, providing properties like `mutate`, `isLoading`, `error`, and `data`.
 */

export const useSessionKeys = (
    mutationProps?: MutationOptionsWithoutMutationFn,
    queryProps?: UseQueryParameters
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const addSessionKeyMutation = useMutation(
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

    const revokeSessionKeyMutation = useMutation(
        {
            mutationFn: async (params: {
                sessionKey: Address;
            }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.revokeSessionKey(params);
            },
            ...mutationProps,
        },
        queryClient
    );

    const addWhitelistDestinationMutation = useMutation(
        {
            mutationFn: async (params: {
                sessionKey: Address;
                destinations: Address[];
            }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.addWhitelistDestination(params);
            },
            ...mutationProps,
        },
        queryClient
    );

    const removeWhitelistDestinationMutation = useMutation(
        {
            mutationFn: async (params: {
                sessionKey: Address;
                destination: Address;
            }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.removeWhitelistDestination(
                    params
                );
            },
            ...mutationProps,
        },
        queryClient
    );

    const useGetSessionFromAddress = (sessionKey: Address) => {
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

    const useIsAddressWhitelistDestination = (
        sessionKey: Address,
        targetAddress: Address
    ) => {
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
                    return await smartAccountClient.isAddressWhitelistDestination(
                        { sessionKey, targetAddress }
                    );
                },
                ...queryProps,
            },
            queryClient
        );
    };

    return {
        addSessionKeyMutation,
        revokeSessionKeyMutation,
        addWhitelistDestinationMutation,
        removeWhitelistDestinationMutation,
        useGetSessionFromAddress,
        useIsAddressWhitelistDestination,
    };
};
