import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext, useState } from "react";
import type { Chain } from "viem";
import { useAccount } from "wagmi";

export const useSwitchChain = () => {
    const { address } = useAccount();
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
        async (params: { chain: Chain }) => {
            const { chain } = params;

            if (!networksConfig) {
                throw new Error("No current configuration found");
            }

            try {
                await updateSmartAccountClient({
                    address: smartAccountClient?.account.address,
                    chain,
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
        (params: { chain: Chain }) => {
            if (!address) throw new Error("No connected wallet");

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
        async (params: { chain: Chain }) => {
            if (!address) throw new Error("No connected wallet");

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
