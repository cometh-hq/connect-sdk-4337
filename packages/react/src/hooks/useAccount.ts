import {
    ConnectContext,
    type ContextComethSmartAccountClient,
} from "@/providers/ConnectProvider";
import { useContext, useMemo } from "react";
import type { Address } from "viem";

export type AccountStatus = "connected" | "disconnected";

export interface UseAccountResult {
    address: Address | undefined;
    smartAccountClient: ContextComethSmartAccountClient | null;
    isConnected: boolean;
    isDisconnected: boolean;
    status: AccountStatus;
}

export const useAccount = (): UseAccountResult => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useAccount must be used within a ConnectProvider");
    }

    const { smartAccountClient, smartAccountAddress } = context;

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
    };
};
