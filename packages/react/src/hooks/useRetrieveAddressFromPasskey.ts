import { retrieveAccountAddressFromPasskey } from "@cometh/connect-sdk-4337";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { UseQueryParameters } from "wagmi/query";

export type UseRetrieveAccountAddressFromPasskeyOptions = {
    apiKey: string;
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
export const useRetrieveAccountAddressFromPasskey = ({
    apiKey,
    baseUrl,
    queryProps,
}: UseRetrieveAccountAddressFromPasskeyOptions) => {
    const query = useQuery({
        queryKey: ["accountAddress", apiKey, baseUrl],
        queryFn: () => retrieveAccountAddressFromPasskey(apiKey, baseUrl),
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
