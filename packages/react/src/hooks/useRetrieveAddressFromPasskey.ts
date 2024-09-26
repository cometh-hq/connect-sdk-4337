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
    fullDomainSelected?: boolean;
    baseUrl?: string;
    queryProps?: UseQueryParameters;
};

export const useRetrieveAccountAddressFromPasskeys = ({
    apiKey,
    chain,
    fullDomainSelected = false,
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
                fullDomainSelected,
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
    }, [apiKey, chain, baseUrl, fullDomainSelected]);

    return {
        retrieveAddress,
        isPending,
        error,
    };
};

export const useRetrieveAccountAddressFromPasskeyId = ({
    apiKey,
    chain,
    fullDomainSelected = false,
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
                    fullDomainSelected,
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
        [apiKey, chain, baseUrl, fullDomainSelected]
    );

    return {
        retrieveAddress,
        isPending,
        error,
    };
};
