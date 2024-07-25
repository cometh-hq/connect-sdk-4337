import {
    type QRCodeOptions,
    type Signer,
    createNewSigner,
    generateQRCodeUrl,
    serializeUrlWithSignerPayload,
    type webAuthnOptions,
} from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

type CreateNewSignerParameters = {
    passKeyName?: string;
    webAuthnOptions?: webAuthnOptions;
};

type SerializeUrlParameters = {
    validationPageUrl: string;
    signerPayload: Signer;
};

type GenerateQRCodeUrlParameters = {
    validationPageUrl: string;
    signerPayload: Signer;
    options?: QRCodeOptions;
};

/**
 * Hook for creating a new signer
 *
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param mutationProps - Optional mutation properties from @tanstack/react-query
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
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useCreateNewSigner = (
    apiKey: string,
    baseUrl?: string,
    mutationProps?: Omit<
        UseMutationOptions<Signer, Error, CreateNewSignerParameters>,
        "mutationFn"
    >
) => {
    const { mutate, mutateAsync, ...result } = useMutation({
        mutationFn: (variables: CreateNewSignerParameters): Promise<Signer> =>
            createNewSigner(apiKey, baseUrl, variables),
        ...mutationProps,
    });

    return {
        ...result,
        createSigner: mutate,
        createSignerAsync: mutateAsync,
    };
};

/**
 * Hook for serializing URL with signer payload
 *
 * @param mutationProps - Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useSerializeUrlWithSignerPayload = (
    mutationProps?: Omit<
        UseMutationOptions<URL, Error, SerializeUrlParameters>,
        "mutationFn"
    >
) => {
    const { mutate, mutateAsync, ...result } = useMutation({
        mutationFn: ({
            validationPageUrl,
            signerPayload,
        }: SerializeUrlParameters): Promise<URL> =>
            serializeUrlWithSignerPayload(validationPageUrl, signerPayload),
        ...mutationProps,
    });

    return {
        ...result,
        serializeUrl: mutate,
        serializeUrlAsync: mutateAsync,
    };
};

/**
 * Hook for generating QR code URL
 *
 * @param mutationProps - Optional mutation properties from @tanstack/react-query
 *
 * @returns An object containing the mutation function and related properties.
 */
export const useGenerateQRCodeUrl = (
    mutationProps?: Omit<
        UseMutationOptions<string, Error, GenerateQRCodeUrlParameters>,
        "mutationFn"
    >
) => {
    const { mutate, mutateAsync, ...result } = useMutation({
        mutationFn: ({
            validationPageUrl,
            signerPayload,
            options,
        }: GenerateQRCodeUrlParameters): Promise<string> =>
            generateQRCodeUrl(validationPageUrl, signerPayload, options),
        ...mutationProps,
    });

    return {
        ...result,
        generateQRCode: mutate,
        generateQRCodeAsync: mutateAsync,
    };
};
