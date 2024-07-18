import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext } from "react";
import type { Address } from "viem";

export const useConnect = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useConnectHook must be used within a ConnectProvider");
    }

    const {
        smartAccountClient,
        smartAccountAddress,
        updateSmartAccountClient,
        ...rest
    } = context;

    const connect = useCallback(
        async (address?: Address) => {
            await updateSmartAccountClient(address);
        },
        [updateSmartAccountClient]
    );

    return {
        smartAccountClient,
        smartAccountAddress,
        connect,
        ...rest,
    };
};
