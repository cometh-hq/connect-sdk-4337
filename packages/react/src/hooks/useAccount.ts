import {
    ConnectContext,
    type ContextComethSmartAccountClient,
} from "@/providers/ConnectProvider";
import { useContext, useMemo } from "react";
import type { Address, Chain } from "viem";

export type AccountStatus = "connected" | "disconnected";

export interface UseAccountResult {
    address: Address | undefined;
    smartAccountClient: ContextComethSmartAccountClient | null;
    isConnected: boolean;
    isDisconnected: boolean;
    status: AccountStatus;
    chain: Chain | undefined;
    chainId: number | undefined;
}

export const useAccount = (): UseAccountResult => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useAccount must be used within a ConnectProvider");
    }

    const { smartAccountClient, smartAccountAddress } = context;

    const { chain, chainId } = useMemo(
        () => ({
            chain: smartAccountClient?.chain,
            chainId: smartAccountClient?.chain?.id,
        }),
        [smartAccountClient]
    );

    const isConnected = useMemo(
        () => !!smartAccountClient && !!smartAccountAddress,
        [smartAccountClient, smartAccountAddress]
    );

    const status: AccountStatus = useMemo(() => {
        return isConnected ? "connected" : "disconnected";
    }, [isConnected]);

    return {
        address: smartAccountAddress,
        smartAccountClient,
        isConnected,
        isDisconnected: !isConnected,
        status,
        chain,
        chainId,
    };
};
