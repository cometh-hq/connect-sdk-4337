import {
    NoCurrentConfigurationError,
    NotWithinConnectProviderError,
    UseSwitchChainError,
} from "@/errors";
import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext, useState } from "react";

export const useSwitchChain = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new NotWithinConnectProviderError("useSwitchChain");
    }

    const {
        queryClient,
        smartAccountClient,
        updateSmartAccountClient,
        networksConfig,
    } = context;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const switchChainInternal = useCallback(
        async (params: { chainId: number }) => {
            const { chainId } = params;

            if (!networksConfig) throw new NoCurrentConfigurationError();

            const selectedNetwork = networksConfig?.find(
                (network) => network.chain?.id === chainId
            );
            if (!selectedNetwork) throw new NoCurrentConfigurationError();

            try {
                const client = await updateSmartAccountClient({
                    address: smartAccountClient?.account.address,
                    chain: selectedNetwork.chain,
                });

                queryClient?.invalidateQueries({
                    queryKey: ["switchChain"],
                });

                return client;
            } catch (e) {
                throw e instanceof Error ? e : new UseSwitchChainError();
            }
        },
        [
            smartAccountClient,
            updateSmartAccountClient,
            queryClient,
            networksConfig,
        ]
    );

    const switchChain = useCallback(
        (params: { chainId: number }) => {
            setIsPending(true);
            setError(null);
            return switchChainInternal(params)
                .catch((e) => {
                    const err =
                        e instanceof Error ? e : new UseSwitchChainError();
                    setError(err);
                })
                .finally(() => {
                    setIsPending(false);
                });
        },
        [switchChainInternal]
    );

    const switchChainAsync = useCallback(
        async (params: { chainId: number }) => {
            setIsPending(true);
            setError(null);
            try {
                const client = await switchChainInternal(params);
                return client;
            } catch (e) {
                const err = e instanceof Error ? e : new UseSwitchChainError();
                setError(err);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        [switchChainInternal]
    );

    return {
        switchChain,
        switchChainAsync,
        isPending,
        error,
    };
};
