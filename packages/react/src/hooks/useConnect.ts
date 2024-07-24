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

    const connect = useCallback(
        ({
            address,
            passKeyName,
        }: { address?: Address; passKeyName?: string }) => {
            setIsPending(true);
            setError(null);
            updateSmartAccountClient({ address, passKeyName })
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
        async ({
            address,
            passKeyName,
        }: { address?: Address; passKeyName?: string }) => {
            setIsPending(true);
            setError(null);
            try {
                await updateSmartAccountClient({ address, passKeyName });
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
        smartAccountClient,
        smartAccountAddress,
        isPending,
        error,
    };
};
