import { createSmartAccount } from "@/actions/createSmartAccount";
import type {
    ComethSmartAccountClient,
    SafeSmartAccount,
    createSafeSmartAccountParameters,
} from "@cometh/connect-sdk-4337";
import type { QueryClient } from "@tanstack/react-query";
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint";
import React, {
    type ReactNode,
    createContext,
    useMemo,
    useState,
    useEffect,
    useCallback,
} from "react";
import type { Address, Chain, Transport } from "viem";

type ConnectConfig =
    createSafeSmartAccountParameters<ENTRYPOINT_ADDRESS_V07_TYPE> & {
        bundlerUrl: string;
        paymasterUrl?: string;
    };

type ContextComethSmartAccountClient = ComethSmartAccountClient<
    SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
    Transport,
    Chain,
    ENTRYPOINT_ADDRESS_V07_TYPE
>;

export type ConnectContextPayload = {
    queryClient?: QueryClient;
    smartAccountClient: ContextComethSmartAccountClient | null;
    smartAccountAddress: Address | undefined;
    updateSmartAccountClient: ({
        address,
        passKeyName,
    }: { address?: Address; passKeyName?: string }) => Promise<void>;
};

export const ConnectContext = createContext<ConnectContextPayload>({
    queryClient: undefined,
    smartAccountClient: null,
    smartAccountAddress: undefined,
    updateSmartAccountClient: async () => {},
});

export const ConnectProvider = <
    TConfig extends ConnectConfig,
    TQueryClient extends QueryClient | undefined,
>({
    children,
    config,
    queryClient,
}: {
    children: ReactNode;
    config: TConfig;
    queryClient: TQueryClient;
}) => {
    const [smartAccountClient, setSmartAccountClient] =
        useState<ContextComethSmartAccountClient | null>(null);
    const [smartAccountAddress, setSmartAccountAddress] = useState<
        Address | undefined
    >(undefined);

    const updateSmartAccountClient = useCallback(
        async ({
            address,
            passKeyName,
        }: { address?: Address; passKeyName?: string }) => {
            const { client, address: newAddress } = await createSmartAccount({
                ...config,
                smartAccountAddress: address,
                comethSignerConfig: {
                    ...config.comethSignerConfig,
                    passKeyName,
                },
            });

            setSmartAccountClient(client);
            setSmartAccountAddress(newAddress);
        },
        [config]
    );

    useEffect(() => {
        if (config.smartAccountAddress) {
            updateSmartAccountClient({ address: config.smartAccountAddress });
        }
    }, [config.smartAccountAddress, updateSmartAccountClient]);

    const value = useMemo(
        (): ConnectContextPayload => ({
            queryClient,
            smartAccountClient,
            smartAccountAddress,
            updateSmartAccountClient,
        }),
        [
            queryClient,
            smartAccountClient,
            smartAccountAddress,
            updateSmartAccountClient,
        ]
    );

    return (
        <ConnectContext.Provider value={value}>
            {children}
        </ConnectContext.Provider>
    );
};
