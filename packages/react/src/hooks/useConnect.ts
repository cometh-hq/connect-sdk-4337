import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext, useState } from "react";
import type { Address } from "viem";

export type ConnectParameters = {
    address?: Address;
    passKeyName?: string;
};

export const useConnect = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useConnect must be used within a ConnectProvider");
    }

    const { queryClient, updateSmartAccountClient } = context;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const connect = useCallback(
        (params: ConnectParameters = {}) => {
            setIsPending(true);
            setError(null);
            updateSmartAccountClient(params)
                .then(() => {
                    queryClient?.invalidateQueries({
                        queryKey: ["connect"],
                    });
                })
                .catch((e) => {
                    const err =
                        e instanceof Error ? e : new Error("An error occurred");
                    setError(err);
                })
                .finally(() => {
                    setIsPending(false);
                });
        },
        [updateSmartAccountClient, queryClient]
    );

    const connectAsync = useCallback(
        async (params: ConnectParameters = {}) => {
            setIsPending(true);
            setError(null);
            try {
                await updateSmartAccountClient(params);
                queryClient?.invalidateQueries({ queryKey: ["connect"] });
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
        connect,
        connectAsync,
        isPending,
        error,
    };
};
