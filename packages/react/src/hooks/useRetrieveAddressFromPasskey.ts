import {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
} from "@cometh/connect-sdk-4337";
import { useCallback, useState } from "react";
import type { Address, Chain } from "viem";
import type { UseQueryParameters } from "wagmi/query";

export type UseRetrieveAccountAddressFromPasskeyOptions = {
    apiKey: string;
    chain: Chain;
    baseUrl?: string;
    queryProps?: UseQueryParameters;
};

export const useRetrieveAccountAddressFromPasskeys = ({
    apiKey,
    chain,
    baseUrl,
}: UseRetrieveAccountAddressFromPasskeyOptions) => {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const retrieveAddress = useCallback(async () => {
        setIsPending(true);
        setError(null);
        try {
            const result = await retrieveAccountAddressFromPasskeys(
                apiKey,
                chain,
                baseUrl
            );
            const address = result as Address;
            return address;
        } catch (e) {
            const err = e instanceof Error ? e : new Error("An error occurred");
            setError(err);
            throw err;
        } finally {
            setIsPending(false);
        }
    }, [apiKey, baseUrl]);

    return {
        retrieveAddress,
        isPending,
        error,
    };
};

export const useRetrieveAccountAddressFromPasskeyId = ({
    apiKey,
    chain,
    baseUrl,
}: UseRetrieveAccountAddressFromPasskeyOptions) => {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const retrieveAddress = useCallback(
        async (id: string) => {
            setIsPending(true);
            setError(null);
            try {
                const result = await retrieveAccountAddressFromPasskeyId({
                    apiKey,
                    chain,
                    id,
                    baseUrl,
                });
                const address = result as Address;
                return address;
            } catch (e) {
                const err =
                    e instanceof Error ? e : new Error("An error occurred");
                setError(err);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        [apiKey, baseUrl]
    );

    return {
        retrieveAddress,
        isPending,
        error,
    };
};
