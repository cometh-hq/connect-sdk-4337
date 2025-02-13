import { NotWithinConnectProviderError, UseDisconnectError } from "@/errors";
import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext, useState } from "react";

export const useDisconnect = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new NotWithinConnectProviderError("useDisconnect");
    }

    const { queryClient, disconnectSmartAccount } = context;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const disconnect = useCallback(() => {
        setIsPending(true);
        setError(null);
        disconnectSmartAccount()
            .then(() => {
                queryClient?.invalidateQueries({
                    queryKey: ["connect"],
                });
            })
            .catch((e) => {
                const err =
                    e instanceof Error
                        ? e
                        : new UseDisconnectError();
                setError(err);
            })
            .finally(() => {
                setIsPending(false);
            });
    }, [disconnectSmartAccount, queryClient]);

    const disconnectAsync = useCallback(async () => {
        setIsPending(true);
        setError(null);
        try {
            await disconnectSmartAccount();
            queryClient?.invalidateQueries({ queryKey: ["connect"] });
        } catch (e) {
            const err =
                e instanceof Error
                    ? e
                    : new UseDisconnectError();
            setError(err);
            throw err;
        } finally {
            setIsPending(false);
        }
    }, [disconnectSmartAccount, queryClient]);

    return {
        disconnect,
        disconnectAsync,
        isPending,
        error,
    };
};
