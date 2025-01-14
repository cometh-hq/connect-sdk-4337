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

const CHAIN_STORAGE_KEY = "currentChain";

export type NetworkParams = {
    chain?: Chain;
    bundlerUrl?: string;
    paymasterUrl?: string;
    rpcUrl?: string;
};

type OmitConfig<T> = Omit<
    T,
    "chain" | "paymasterUrl" | "bundlerUrl" | "rpcUrl"
> & {
    networksConfig: NetworkParams[];
};

type ConnectConfig = OmitConfig<
    createSafeSmartAccountParameters<ENTRYPOINT_ADDRESS_V07_TYPE>
>;

export type ContextComethSmartAccountClient = ComethSmartAccountClient<
    SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
    Transport,
    Chain,
    ENTRYPOINT_ADDRESS_V07_TYPE
>;

export type UpdateClientPayload = ConnectParameters & { chain?: Chain };

export type ConnectContextPayload = {
    queryClient?: QueryClient;
    smartAccountClient: ContextComethSmartAccountClient | null;
    smartAccountAddress: Address | undefined;
    updateSmartAccountClient: (params?: UpdateClientPayload) => Promise<ContextComethSmartAccountClient | null>;
    disconnectSmartAccount: () => Promise<void>;
    networksConfig: NetworkParams[] | undefined;
};

export const ConnectContext = createContext<ConnectContextPayload>({
    queryClient: undefined,
    smartAccountClient: null,
    smartAccountAddress: undefined,
    updateSmartAccountClient: async () => null,
    disconnectSmartAccount: async () => {},
    networksConfig: undefined,
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
        async (params: UpdateClientPayload = {}) => {
            const chain: Chain =
                params.chain ??
                JSON.parse(localStorage.getItem(CHAIN_STORAGE_KEY) ?? "null") ??
                config.networksConfig[0].chain;

            const bundlerUrl = config.networksConfig.find(
                (network) => network.chain?.id === chain.id
            )?.bundlerUrl;
            const paymasterUrl = config.networksConfig.find(
                (network) => network.chain?.id === chain.id
            )?.paymasterUrl;
            const rpcUrl = config.networksConfig.find(
                (network) => network.chain?.id === chain.id
            )?.rpcUrl;

            if (!bundlerUrl) throw new Error("Bundler url not found");

            try {

                const { client, address: newAddress } =
                    await createSmartAccount({
                        ...config,
                        chain,
                        bundlerUrl,
                        paymasterUrl,
                        rpcUrl,
                        smartAccountAddress: params.address,
                        comethSignerConfig: {
                            ...config.comethSignerConfig,
                            passKeyName: params.passKeyName,
                        },
                    });

                setSmartAccountClient(client);
                setSmartAccountAddress(newAddress);

                localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(chain));

                return client;
            } catch (e) {
                console.log(e);
                return smartAccountClient;
            }
        },
        [config]
    );

    const disconnectSmartAccount = useCallback(async () => {
        setSmartAccountClient(null);
        setSmartAccountAddress(undefined);
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
            networksConfig: config.networksConfig,
        }),
        [
            queryClient,
            smartAccountClient,
            smartAccountAddress,
            updateSmartAccountClient,
            disconnectSmartAccount,
            config.networksConfig,
        ]
    );

    return (
        <ConnectContext.Provider value={value}>
            {children}
        </ConnectContext.Provider>
    );
};
