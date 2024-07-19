import { useSmartAccount } from "@/hooks";
import type { EnrichedOwner } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import type { UseQueryParameters } from "wagmi/query";
import type { MutationOptionsWithoutMutationFn } from "./types";

/**
 * @description A custom hook for managing owners of a smart account.
 *
 * This hook provides functionality to add and remove owners, as well as retrieve
 * information about current owners. It includes both mutation and query functions
 * to interact with the smart account's ownership structure.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 * @param queryProps Optional query properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useOwners } from "@/hooks/useOwners";
 * import { useState } from "react";
 * import { Address } from "viem";
 *
 * export const OwnershipManager = () => {
 *   const {
 *     addOwner,
 *     removeOwner,
 *     useGetOwners,
 *     useGetEnrichedOwners
 *   } = useOwners();
 *
 *   const [newOwnerAddress, setNewOwnerAddress] = useState<Address>();
 *   const [ownerToRemove, setOwnerToRemove] = useState<Address>();
 *
 *   const { data: owners, isLoading: ownersLoading } = useGetOwners();
 *   const { data: enrichedOwners, isLoading: enrichedOwnersLoading } = useGetEnrichedOwners();
 *
 *   const handleAddOwner = () => {
 *     if (newOwnerAddress) {
 *       addOwner.mutate({ ownerToAdd: newOwnerAddress });
 *     }
 *   };
 *
 *   const handleRemoveOwner = () => {
 *     if (ownerToRemove) {
 *       removeOwner.mutate({ ownerToRemove });
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         placeholder="New owner address"
 *         onChange={(e) => setNewOwnerAddress(e.target.value as Address)}
 *       />
 *       <button onClick={handleAddOwner}>Add Owner</button>
 *
 *       <input
 *         placeholder="Owner to remove"
 *         onChange={(e) => setOwnerToRemove(e.target.value as Address)}
 *       />
 *       <button onClick={handleRemoveOwner}>Remove Owner</button>
 *
 *       {ownersLoading ? (
 *         <p>Loading owners...</p>
 *       ) : (
 *         <ul>
 *           {owners?.map((owner) => (
 *             <li key={owner}>{owner}</li>
 *           ))}
 *         </ul>
 *       )}
 *
 *       {enrichedOwnersLoading ? (
 *         <p>Loading enriched owner data...</p>
 *       ) : (
 *         <ul>
 *           {Array.isArray(enrichedOwners) && enrichedOwners.map((owner) => (
 *             <li key={owner.address}>
 *               {owner.address} - Created: {owner.creationDate?.toDateString()}
 *             </li>
 *           ))}
 *         </ul>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `addOwner`: Mutation function for adding a new owner to the smart account.
 * - `removeOwner`: Mutation function for removing an existing owner from the smart account.
 * - `useGetOwners`: Query hook for retrieving the list of current owners.
 * - `useGetEnrichedOwners`: Query hook for retrieving detailed information about current owners.
 *
 * Each mutation and query function adheres to the react-query API, providing properties like
 * `mutate`, `isLoading`, `error`, and `data`.
 */

export const useOwners = (
    mutationProps?: MutationOptionsWithoutMutationFn,
    queryProps?: UseQueryParameters
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const addOwner = useMutation(
        {
            mutationFn: async (args: {
                ownerToAdd: Address;
            }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.addOwner(args);
            },
            ...mutationProps,
        },
        queryClient
    );

    const removeOwner = useMutation(
        {
            mutationFn: async (args: {
                ownerToRemove: Address;
            }): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.removeOwner(args);
            },
            ...mutationProps,
        },
        queryClient
    );

    const useGetOwners = () => {
        return useQuery(
            {
                queryKey: ["getOwners"],
                queryFn: async (): Promise<readonly Address[]> => {
                    if (!smartAccountClient) {
                        throw new Error("No smart account found");
                    }
                    return await smartAccountClient.getOwners();
                },
                ...queryProps,
            },
            queryClient
        );
    };

    const useGetEnrichedOwners = () => {
        return useQuery(
            {
                queryKey: ["getEnrichedOwners"],
                queryFn: async (): Promise<EnrichedOwner | EnrichedOwner[]> => {
                    if (!smartAccountClient) {
                        throw new Error("No smart account found");
                    }
                    return await smartAccountClient.getEnrichedOwners();
                },
                ...queryProps,
            },
            queryClient
        );
    };

    return {
        addOwner,
        removeOwner,
        useGetOwners,
        useGetEnrichedOwners,
    };
};
