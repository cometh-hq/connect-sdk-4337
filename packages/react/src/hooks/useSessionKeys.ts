import { useSmartAccount } from "@/hooks";
import type { AddSessionKeyParams, Session } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import type { UseQueryParameters } from "wagmi/query";
import type { MutationOptionsWithoutMutationFn } from "./types";

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
