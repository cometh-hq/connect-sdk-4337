import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { EnrichedOwner } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
    UseMutationOptions,
    UseQueryOptions,
} from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import type { QueryResultType } from "../types";

type AddOwnerParameters = {
    ownerToAdd: Address;
};

type RemoveOwnerParameters = {
    ownerToRemove: Address;
};

// Return types for each mutation hook
export type UseAddOwnerReturn = QueryResultType & {
    addOwner: (params: AddOwnerParameters) => void;
    addOwnerAsync: (params: AddOwnerParameters) => Promise<Hash>;
};

export type UseRemoveOwnerReturn = QueryResultType & {
    removeOwner: (params: RemoveOwnerParameters) => void;
    removeOwnerAsync: (params: RemoveOwnerParameters) => Promise<Hash>;
};

/**
 * A custom hook for adding a new owner to a smart account.
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 * @returns An object containing the mutation function and related properties.
 * @throws {Error} If no smart account is found when trying to add an owner.
 */
export const useAddOwner = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, AddOwnerParameters>,
        "mutationFn"
    >
): UseAddOwnerReturn => {
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
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        addOwner: mutate,
        addOwnerAsync: mutateAsync,
    };
};

/**
 * A custom hook for removing an owner from a smart account.
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 * @returns An object containing the mutation function and related properties.
 * @throws {Error} If no smart account is found when trying to remove an owner.
 */
export const useRemoveOwner = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, RemoveOwnerParameters>,
        "mutationFn"
    >
): UseRemoveOwnerReturn => {
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
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        removeOwner: mutate,
        removeOwnerAsync: mutateAsync,
    };
};

/**
 * A custom hook for retrieving the list of current owners of a smart account.
 * @param queryProps Optional query properties from @tanstack/react-query
 * @returns An object containing the query result and related properties.
 * @throws {Error} If no smart account is found when trying to get owners.
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
 * A custom hook for retrieving detailed information about current owners of a smart account.
 * @param queryProps Optional query properties from @tanstack/react-query
 * @returns An object containing the query result and related properties.
 * @throws {Error} If no smart account is found when trying to get enriched owners.
 */
export const useGetEnrichedOwners = (
    queryProps?: Omit<
        UseQueryOptions<EnrichedOwner[], Error>,
        "queryKey" | "queryFn"
    >
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    return useQuery(
        {
            queryKey: ["getEnrichedOwners"],
            queryFn: async (): Promise<EnrichedOwner[]> => {
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
