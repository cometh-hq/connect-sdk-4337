import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { AddSessionKeyParams, Session } from "@cometh/connect-sdk-4337";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
    UseMutationOptions,
    UseQueryOptions,
} from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import type { QueryResultType } from "./../types";

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

// Return types for each mutation hook
export type UseAddSessionKeyReturn = QueryResultType & {
    addSessionKey: (params: AddSessionKeyParameters) => void;
    addSessionKeyAsync: (params: AddSessionKeyParameters) => Promise<Hash>;
};

export type UseRevokeSessionKeyReturn = QueryResultType & {
    revokeSessionKey: (params: RevokeSessionKeyParameters) => void;
    revokeSessionKeyAsync: (
        params: RevokeSessionKeyParameters
    ) => Promise<Hash>;
};

export type UseAddWhitelistDestinationReturn = QueryResultType & {
    addWhitelistDestination: (
        params: AddWhitelistDestinationParameters
    ) => void;
    addWhitelistDestinationAsync: (
        params: AddWhitelistDestinationParameters
    ) => Promise<Hash>;
};

export type UseRemoveWhitelistDestinationReturn = QueryResultType & {
    removeWhitelistDestination: (
        params: RemoveWhitelistDestinationParameters
    ) => void;
    removeWhitelistDestinationAsync: (
        params: RemoveWhitelistDestinationParameters
    ) => Promise<Hash>;
};

export const useAddSessionKey = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, AddSessionKeyParameters>,
        "mutationFn"
    >
): UseAddSessionKeyReturn => {
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
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        addSessionKey: mutate,
        addSessionKeyAsync: mutateAsync,
    };
};

export const useRevokeSessionKey = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, RevokeSessionKeyParameters>,
        "mutationFn"
    >
): UseRevokeSessionKeyReturn => {
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
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        revokeSessionKey: mutate,
        revokeSessionKeyAsync: mutateAsync,
    };
};

export const useAddWhitelistDestination = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, AddWhitelistDestinationParameters>,
        "mutationFn"
    >
): UseAddWhitelistDestinationReturn => {
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
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        addWhitelistDestination: mutate,
        addWhitelistDestinationAsync: mutateAsync,
    };
};

export const useRemoveWhitelistDestination = (
    mutationProps?: Omit<
        UseMutationOptions<Hash, Error, RemoveWhitelistDestinationParameters>,
        "mutationFn"
    >
): UseRemoveWhitelistDestinationReturn => {
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
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        removeWhitelistDestination: mutate,
        removeWhitelistDestinationAsync: mutateAsync,
    };
};

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
