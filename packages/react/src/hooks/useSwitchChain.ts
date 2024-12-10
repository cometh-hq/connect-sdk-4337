import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext, useState } from "react";

export const useSwitchChain = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useSwitchChain must be used within a ConnectProvider");
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

            if (!networksConfig)
                throw new Error("No current configuration found");

            const selectedNetwork = networksConfig?.find(
                (network) => network.chain?.id === chainId
            );
            if (!selectedNetwork)
                throw new Error("No current configuration found");

            try {
                await updateSmartAccountClient({
                    address: smartAccountClient?.account.address,
                    chain: selectedNetwork.chain,
                });

                queryClient?.invalidateQueries({
                    queryKey: ["switchChain"],
                });
            } catch (e) {
                throw e instanceof Error
                    ? e
                    : new Error("An error occurred while switching chain");
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
            switchChainInternal(params)
                .catch((e) => {
                    const err =
                        e instanceof Error
                            ? e
                            : new Error(
                                  "An error occurred while switching chain"
                              );
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
                await switchChainInternal(params);
            } catch (e) {
                const err =
                    e instanceof Error
                        ? e
                        : new Error("An error occurred while switching chain");
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
