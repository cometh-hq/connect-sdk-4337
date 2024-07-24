import { ConnectContext } from "@/providers/ConnectProvider";
import { useContext, useMemo } from "react";

export type AccountStatus = "connected" | "disconnected";

export const useAccount = () => {
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
