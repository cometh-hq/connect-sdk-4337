import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext, useState } from "react";
import type { Address } from "viem";

export const useConnect = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useConnect must be used within a ConnectProvider");
    }

    const {
        queryClient,
        smartAccountClient,
        smartAccountAddress,
        updateSmartAccountClient,
    } = context;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const connectAsync = useCallback(
        async (address?: Address) => {
            setIsPending(true);
            setError(null);
            try {
                await updateSmartAccountClient(address);
                queryClient?.invalidateQueries({ queryKey: ["smartAccount"] });
            } catch (e) {
                const err =
                    e instanceof Error ? e : new Error("An error occurred");
                setError(err);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        [updateSmartAccountClient, queryClient]
    );

    return {
        connectAsync,
        smartAccountClient,
        smartAccountAddress,
        isPending,
        error,
    };
};
