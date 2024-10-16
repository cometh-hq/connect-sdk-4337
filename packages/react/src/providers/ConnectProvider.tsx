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

const CHAIN_STORAGE_KEY = 'currentConnectedChain';


type ConnectConfig =
    createSafeSmartAccountParameters<ENTRYPOINT_ADDRESS_V07_TYPE> & {
        bundlerUrl: string;
        paymasterUrl?: string;
    };

export type ContextComethSmartAccountClient = ComethSmartAccountClient<
    SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
    Transport,
    Chain,
    ENTRYPOINT_ADDRESS_V07_TYPE
>;

export type UpdateClientPayload = ConnectParameters & {
    chain?: Chain;
    bundlerUrl?: string;
    paymasterUrl?: string;
};

export type ConnectContextPayload = {
    queryClient?: QueryClient;
    smartAccountClient: ContextComethSmartAccountClient | null;
    smartAccountAddress: Address | undefined;
    updateSmartAccountClient: (params?: UpdateClientPayload) => Promise<void>;
    disconnectSmartAccount: () => Promise<void>;
    config: ConnectConfig | undefined;
};

export const ConnectContext = createContext<ConnectContextPayload>({
    queryClient: undefined,
    smartAccountClient: null,
    smartAccountAddress: undefined,
    updateSmartAccountClient: async () => {},
    disconnectSmartAccount: async () => {},
    config: undefined,
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
    const [currentChain, setCurrentChain] = useState<Chain | undefined>(config.chain);


    useEffect(() => {
        const storedChain = localStorage.getItem(CHAIN_STORAGE_KEY);
        if (storedChain) {
            setCurrentChain(JSON.parse(storedChain));
        }
    }, []);

    const updateSmartAccountClient = useCallback(
        async (params: UpdateClientPayload = {}) => {
            const updatedChain = params.chain ?? currentChain ?? config.chain
            try {
                const { client, address: newAddress } =
                    await createSmartAccount({
                        ...config,
                        chain: updatedChain,
                        bundlerUrl: params.bundlerUrl ?? config.bundlerUrl,
                        paymasterUrl:
                            params.paymasterUrl ?? config.paymasterUrl,
                        smartAccountAddress: params.address,
                        comethSignerConfig: {
                            ...config.comethSignerConfig,
                            passKeyName: params.passKeyName,
                        },
                    });

                setSmartAccountClient(client);
                setSmartAccountAddress(newAddress);
                setCurrentChain(updatedChain);

                localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(updatedChain));
            } catch (e) {
                console.log(e);
            }
        },
        [config]
    );

    const disconnectSmartAccount = useCallback(async () => {
        setSmartAccountClient(null);
        setSmartAccountAddress(undefined);
        setCurrentChain(undefined);
        localStorage.removeItem(CHAIN_STORAGE_KEY);
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
            config,
        }),
        [
            queryClient,
            smartAccountClient,
            smartAccountAddress,
            updateSmartAccountClient,
            disconnectSmartAccount,
            config,
        ]
    );

    return (
        <ConnectContext.Provider value={value}>
            {children}
        </ConnectContext.Provider>
    );
};
