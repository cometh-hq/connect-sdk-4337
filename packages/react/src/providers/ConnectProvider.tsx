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
import type { Address, Chain, Hex, Transport } from "viem";

export type ConnectProviderProps = {
    children: ReactNode;
    config: createSafeSmartAccountParameters<ENTRYPOINT_ADDRESS_V07_TYPE> & {
        bundlerUrl: string;
        paymasterUrl?: string;
    };
    queryClient: QueryClient | undefined;
};

type ContextComethSmartAccountClient = ComethSmartAccountClient<
    SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
    Transport,
    Chain,
    ENTRYPOINT_ADDRESS_V07_TYPE
>;

export type ConnectContextPayload = {
    queryClient: QueryClient | undefined;
    smartAccountClient: ContextComethSmartAccountClient | null;
    smartAccountAddress: Hex;
    updateSmartAccountClient: (address?: Address) => Promise<void>;
};

export const ConnectContext = createContext<ConnectContextPayload | undefined>(
    undefined
);

export const ConnectProvider = (props: ConnectProviderProps) => {
    const { children, config, queryClient } = props;
    const [smartAccountClient, setSmartAccountClient] =
        useState<ContextComethSmartAccountClient | null>(null);
    const [smartAccountAddress, setSmartAccountAddress] = useState<Hex>(
        "0x" as Hex
    );

    const updateSmartAccountClient = useCallback(
        async (address?: Address) => {
            const { client, address: newAddress } = await createSmartAccount({
                ...config,
                smartAccountAddress: address,
            });
            setSmartAccountClient(client);
            setSmartAccountAddress(newAddress);
        },
        [config]
    );

    useEffect(() => {
        if (config.smartAccountAddress) {
            updateSmartAccountClient(config.smartAccountAddress);
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
