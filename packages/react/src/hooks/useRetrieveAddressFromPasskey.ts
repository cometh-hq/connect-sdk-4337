import {
    retrieveAccountAddressFromPasskeyId,
    retrieveAccountAddressFromPasskeys,
} from "@cometh/connect-sdk-4337";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { UseQueryParameters } from "wagmi/query";

export type UseRetrieveAccountAddressFromPasskeyOptions = {
    apiKey: string;
    baseUrl?: string;
    queryProps?: UseQueryParameters;
};

export type UseRetrieveAccountAddressFromPasskeyIdOptions = {
    apiKey: string;
    id: string;
    baseUrl?: string;
    queryProps?: UseQueryParameters;
};

/**
 * A hook that retrieves the account address associated with a passkey.
 *
 * @param options - The options for the hook
 * @param options.apiKey - The API key for authentication
 * @param options.baseUrl - Optional base URL for the API
 * @param options.queryProps - Additional options for the React Query useQuery hook
 *
 * @returns An object containing the query result and a function to retrieve the address
 *
 * @example
 * ```tsx
 * const {
 *   retrieveAddress,
 *   data: address,
 *   isLoading,
 *   error
 * } = useRetrieveAccountAddressFromPasskey({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.example.com'
 * });
 *
 * const handleRetrieveAddress = async () => {
 *   try {
 *     const address = await retrieveAddress();
 *     console.log("Retrieved address:", address);
 *   } catch (error) {
 *     console.error("Error retrieving address:", error);
 *   }
 * };
 * ```
 */
export const useRetrieveAccountAddressFromPasskeys = ({
    apiKey,
    baseUrl,
    queryProps,
}: UseRetrieveAccountAddressFromPasskeyOptions) => {
    const query = useQuery({
        queryKey: ["accountAddress", apiKey, baseUrl],
        queryFn: () => retrieveAccountAddressFromPasskeys(apiKey, baseUrl),
        ...queryProps,
    });

    const retrieveAddress = async (): Promise<Address> => {
        const result = await query.refetch();
        if (result.error) throw result.error;
        return result.data as Address;
    };

    return {
        ...query,
        retrieveAddress,
    };
};

export const useRetrieveAccountAddressFromPasskeyId = ({
    apiKey,
    id,
    baseUrl,
    queryProps,
}: UseRetrieveAccountAddressFromPasskeyIdOptions) => {
    const query = useQuery({
        queryKey: ["accountAddress", apiKey, baseUrl],
        queryFn: () =>
            retrieveAccountAddressFromPasskeyId({ apiKey, id, baseUrl }),
        ...queryProps,
    });

    const retrieveAddress = async (): Promise<Address> => {
        const result = await query.refetch();
        if (result.error) throw result.error;
        return result.data as Address;
    };

    return {
        ...query,
        retrieveAddress,
    };
};
