import { createSmartAccount } from "@/actions/createSmartAccount";
import type { ConnectParameters } from "@/hooks/useConnect";
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
    updateSmartAccountClient: (params?: ConnectParameters) => Promise<void>;
    disconnectSmartAccount: () => Promise<void>;
};

export const ConnectContext = createContext<ConnectContextPayload>({
    queryClient: undefined,
    smartAccountClient: null,
    smartAccountAddress: undefined,
    updateSmartAccountClient: async () => {},
    disconnectSmartAccount: async () => {},
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
        async (params: ConnectParameters = {}) => {
            const { client, address: newAddress } = await createSmartAccount({
                ...config,
                smartAccountAddress: params.address,
                comethSignerConfig: {
                    ...config.comethSignerConfig,
                    passKeyName: params.passKeyName,
                },
            });

            setSmartAccountClient(client);
            setSmartAccountAddress(newAddress);
        },
        [config]
    );

    const disconnectSmartAccount = useCallback(async () => {
        setSmartAccountClient(null);
        setSmartAccountAddress(undefined);
    }, []);

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
            disconnectSmartAccount,
        }),
        [
            queryClient,
            smartAccountClient,
            smartAccountAddress,
            updateSmartAccountClient,
            disconnectSmartAccount,
        ]
    );

    return (
        <ConnectContext.Provider value={value}>
            {children}
        </ConnectContext.Provider>
    );
};