import { useMutation } from "@tanstack/react-query";

import {
    type QRCodeOptions,
    type Signer,
    createNewSigner,
    generateQRCodeUrl,
    serializeUrlWithSignerPayload,
} from "@cometh/connect-sdk-4337";
import type { Address } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

export type UseCreateNewSignerProps = {
    smartAccountAddress: Address;
    passKeyName?: string;
    encryptionSalt?: string;
};

/**
 * Hook for creating a new signer
 *
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param mutationProps - Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing the mutation result and a createSigner function
 *
 * @example
 * ```tsx
 * import { useCreateNewSigner } from './path-to-this-file';
 *
 * const MyComponent = () => {
 *   const { createSigner, isLoading, error, data } = useCreateNewSigner('your-api-key', 'https://api.example.com');
 *
 *   const handleCreateSigner = async () => {
 *     try {
 *       const newSigner = await createSigner({
 *         smartAccountAddress: '0x1234...', // Replace with actual address
 *         passKeyName: 'MyNewPasskey'
 *       });
 *       console.log('New signer created:', newSigner);
 *     } catch (err) {
 *       console.error('Error creating signer:', err);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleCreateSigner} disabled={isLoading}>
 *         Create New Signer
 *       </button>
 *       {isLoading && <p>Creating signer...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *       {data && <p>Signer created successfully!</p>}
 *     </div>
 *   );
 * };
 * ```
 */

export const useCreateNewSigner = (
    apiKey: string,
    baseUrl?: string,
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const mutation = useMutation({
        mutationFn: (variables: UseCreateNewSignerProps): Promise<Signer> =>
            createNewSigner(apiKey, baseUrl, variables),
        ...mutationProps,
    });

    const createSigner = async (
        variables: UseCreateNewSignerProps
    ): Promise<Signer> => {
        return mutation.mutateAsync(variables);
    };

    return {
        ...mutation,
        createSigner,
    };
};

// Hook for serializeUrlWithSignerPayload
export type UseSerializeUrlProps = {
    validationPageUrl: string;
    signerPayload: Signer;
};

export const useSerializeUrlWithSignerPayload = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const mutation = useMutation({
        mutationFn: (variables: UseSerializeUrlProps): Promise<URL> =>
            serializeUrlWithSignerPayload(
                variables.validationPageUrl,
                variables.signerPayload
            ),
        ...mutationProps,
    });

    const serializeUrl = async (
        variables: UseSerializeUrlProps
    ): Promise<URL> => {
        return mutation.mutateAsync(variables);
    };

    return {
        ...mutation,
        serializeUrl,
    };
};

// Hook for generateQRCodeUrl
export type UseGenerateQRCodeUrlProps = {
    validationPageUrl: string;
    signerPayload: Signer;
    options?: QRCodeOptions;
};

export const useGenerateQRCodeUrl = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const mutation = useMutation({
        mutationFn: (variables: UseGenerateQRCodeUrlProps): Promise<string> =>
            generateQRCodeUrl(
                variables.validationPageUrl,
                variables.signerPayload,
                variables.options
            ),
        ...mutationProps,
    });

    const generateQRCode = async (
        variables: UseGenerateQRCodeUrlProps
    ): Promise<string> => {
        return mutation.mutateAsync(variables);
    };

    return {
        ...mutation,
        generateQRCode,
    };
};
