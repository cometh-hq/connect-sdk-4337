import { useSmartAccount } from "@/hooks";
import type { EnrichedOwner } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
    UseMutationOptions,
    UseQueryOptions,
} from "@tanstack/react-query";
import type { Address, Hash } from "viem";

type AddOwnerParameters = {
    ownerToAdd: Address;
};

type RemoveOwnerParameters = {
    ownerToRemove: Address;
};

/**
 * @description A custom hook for adding a new owner to a smart account.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useAddOwner } from "@/hooks/owners";
 *
 * const AddOwnerComponent = () => {
 *   const { addOwner, isLoading, error } = useAddOwner();
 *
 *   const handleAddOwner = async (newOwnerAddress: Address) => {
 *     try {
 *       const hash = await addOwner({ ownerToAdd: newOwnerAddress });
 *       console.log("Owner added, transaction hash:", hash);
 *     } catch (err) {
 *       console.error("Error adding owner:", err);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={() => handleAddOwner("0x...")} disabled={isLoading}>
 *       Add Owner
 *     </button>
 *   );
 * };
 * ```
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useAddOwner = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, AddOwnerParameters>,
        "mutationFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async ({
                ownerToAdd,
            }: AddOwnerParameters): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.addOwner({ ownerToAdd });
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...result,
        addOwner: mutate,
        addOwnerAsync: mutateAsync,
    };
};

/**
 * @description A custom hook for removing an owner from a smart account.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useRemoveOwner } from "@/hooks/owners";
 *
 * const RemoveOwnerComponent = () => {
 *   const { removeOwner, isLoading, error } = useRemoveOwner();
 *
 *   const handleRemoveOwner = async (ownerAddress: Address) => {
 *     try {
 *       const hash = await removeOwner({ ownerToRemove: ownerAddress });
 *       console.log("Owner removed, transaction hash:", hash);
 *     } catch (err) {
 *       console.error("Error removing owner:", err);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={() => handleRemoveOwner("0x...")} disabled={isLoading}>
 *       Remove Owner
 *     </button>
 *   );
 * };
 * ```
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useRemoveOwner = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, RemoveOwnerParameters>,
        "mutationFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async ({
                ownerToRemove,
            }: RemoveOwnerParameters): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                return await smartAccountClient.removeOwner({ ownerToRemove });
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        ...result,
        removeOwner: mutate,
        removeOwnerAsync: mutateAsync,
    };
};

/**
 * @description A custom hook for retrieving the list of current owners of a smart account.
 *
 * @param queryProps Optional query properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useGetOwners } from "@/hooks/owners";
 *
 * const OwnersList = () => {
 *   const { data: owners, isLoading, error } = useGetOwners();
 *
 *   if (isLoading) return <p>Loading owners...</p>;
 *   if (error) return <p>Error loading owners: {error.message}</p>;
 *
 *   return (
 *     <ul>
 *       {owners?.map((owner) => (
 *         <li key={owner}>{owner}</li>
 *       ))}
 *     </ul>
 *   );
 * };
 * ```
 *
 * @returns An object containing the query result and related properties.
 */
export const useGetOwners = (
    queryProps?: Omit<
        UseQueryOptions<readonly Address[], Error>,
        "queryKey" | "queryFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

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

/**
 * @description A custom hook for retrieving detailed information about current owners of a smart account.
 *
 * @param queryProps Optional query properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useGetEnrichedOwners } from "@/hooks/owners";
 *
 * const EnrichedOwnersList = () => {
 *   const { data: enrichedOwners, isLoading, error } = useGetEnrichedOwners();
 *
 *   if (isLoading) return <p>Loading enriched owner data...</p>;
 *   if (error) return <p>Error loading enriched owner data: {error.message}</p>;
 *
 *   return (
 *     <ul>
 *       {Array.isArray(enrichedOwners) && enrichedOwners.map((owner) => (
 *         <li key={owner.address}>
 *           {owner.address} - Created: {owner.creationDate?.toDateString()}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * };
 * ```
 *
 * @returns An object containing the query result and related properties.
 */
export const useGetEnrichedOwners = (
    queryProps?: Omit<
        UseQueryOptions<EnrichedOwner | EnrichedOwner[], Error>,
        "queryKey" | "queryFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

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
