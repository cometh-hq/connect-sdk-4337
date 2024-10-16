import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext, useState } from "react";
import type { Chain } from "viem";

export type SwitchChainParameters = {
    chain: Chain;
    bundlerUrl: string;
    paymasterUrl?: string;
};

export const useSwitchChain = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useSwitchChain must be used within a ConnectProvider");
    }

    const {
        queryClient,
        smartAccountClient,
        updateSmartAccountClient,
        disconnectSmartAccount,
        config: currentConfig,
    } = context;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const switchChainInternal = useCallback(
        async (params: SwitchChainParameters) => {
            const { chain, bundlerUrl, paymasterUrl } = params;

            try {
                await disconnectSmartAccount();

                if (!currentConfig) {
                    throw new Error("No current configuration found");
                }

                await updateSmartAccountClient({
                    address: smartAccountClient?.account.address,
                    chain,
                    bundlerUrl,
                    paymasterUrl,
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
            disconnectSmartAccount,
            updateSmartAccountClient,
            queryClient,
            currentConfig,
        ]
    );

    const switchChain = useCallback(
        (params: SwitchChainParameters) => {
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
        async (params: SwitchChainParameters) => {
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
