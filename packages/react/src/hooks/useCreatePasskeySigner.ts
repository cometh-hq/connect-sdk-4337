import {
    type QRCodeOptions,
    type Signer,
    createNewSigner,
    generateQRCodeUrl,
    serializeUrlWithSignerPayload,
    type webAuthnOptions,
} from "@cometh/connect-sdk-4337";
import { useCallback, useState } from "react";
import { useSmartAccount } from "./useSmartAccount";

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
export const useCreateNewSigner = (apiKey: string, baseUrl?: string) => {
    const { queryClient } = useSmartAccount();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const createSigner = useCallback(
        (params: CreateNewSignerParameters = {}) => {
            setIsPending(true);
            setError(null);
            createNewSigner(apiKey, baseUrl, params)
                .then((signer) => {
                    queryClient?.invalidateQueries({ queryKey: ["signer"] });
                    return signer;
                })
                .catch((e) => {
                    const err =
                        e instanceof Error ? e : new Error("An error occurred");
                    setError(err);
                })
                .finally(() => {
                    setIsPending(false);
                });
        },
        [apiKey, baseUrl, queryClient]
    );

    const createSignerAsync = useCallback(
        async (params: CreateNewSignerParameters = {}) => {
            setIsPending(true);
            setError(null);
            try {
                const signer = await createNewSigner(apiKey, baseUrl, params);
                queryClient?.invalidateQueries({ queryKey: ["signer"] });
                return signer;
            } catch (e) {
                const err =
                    e instanceof Error ? e : new Error("An error occurred");
                setError(err);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        [apiKey, baseUrl, queryClient]
    );

    return {
        createSigner,
        createSignerAsync,
        isPending,
        error,
    };
};

export const useSerializeUrlWithSignerPayload = () => {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const serializeUrl = useCallback((params: SerializeUrlParameters) => {
        setIsPending(true);
        setError(null);
        serializeUrlWithSignerPayload(
            params.validationPageUrl,
            params.signerPayload
        )
            .then((url) => {
                return url;
            })
            .catch((e) => {
                const err =
                    e instanceof Error ? e : new Error("An error occurred");
                setError(err);
            })
            .finally(() => {
                setIsPending(false);
            });
    }, []);

    const serializeUrlAsync = useCallback(
        async (params: SerializeUrlParameters) => {
            setIsPending(true);
            setError(null);
            try {
                return await serializeUrlWithSignerPayload(
                    params.validationPageUrl,
                    params.signerPayload
                );
            } catch (e) {
                const err =
                    e instanceof Error ? e : new Error("An error occurred");
                setError(err);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        []
    );

    return {
        serializeUrl,
        serializeUrlAsync,
        isPending,
        error,
    };
};

export const useGenerateQRCodeUrl = () => {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const generateQRCode = useCallback(
        (params: GenerateQRCodeUrlParameters) => {
            setIsPending(true);
            setError(null);
            generateQRCodeUrl(
                params.validationPageUrl,
                params.signerPayload,
                params.options
            )
                .then((qrCodeUrl) => {
                    return qrCodeUrl;
                })
                .catch((e) => {
                    const err =
                        e instanceof Error ? e : new Error("An error occurred");
                    setError(err);
                })
                .finally(() => {
                    setIsPending(false);
                });
        },
        []
    );

    const generateQRCodeAsync = useCallback(
        async (params: GenerateQRCodeUrlParameters) => {
            setIsPending(true);
            setError(null);
            try {
                return await generateQRCodeUrl(
                    params.validationPageUrl,
                    params.signerPayload,
                    params.options
                );
            } catch (e) {
                const err =
                    e instanceof Error ? e : new Error("An error occurred");
                setError(err);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        []
    );

    return {
        generateQRCode,
        generateQRCodeAsync,
        isPending,
        error,
    };
};
