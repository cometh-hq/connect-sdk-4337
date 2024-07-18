import { useSmartAccount } from "@/hooks";
import type { EnrichedOwner } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import type { UseQueryParameters } from "wagmi/query";
import type { MutationOptionsWithoutMutationFn } from "./types";

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
