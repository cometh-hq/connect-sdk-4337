import { API } from "@/core/services/API";
import { getDeviceData } from "@/core/services/deviceService";
import { isFallbackSigner } from "@/core/signers/createSigner";
import { encryptSignerInStorage } from "@/core/signers/ecdsa/services/ecdsaService";
import {
    createPasskeySigner,
    setPasskeyInStorage,
} from "@/core/signers/passkeys/passkeyService";
import type { webAuthnOptions } from "@/core/signers/passkeys/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "@/core/signers/passkeys/utils";
import type { Signer } from "@/core/types";
import {
    DeviceNotCompatibleWithPasskeysError,
    DeviceNotCompatibleWithSECKP256r1PasskeysError,
    FailedToGenerateQRCodeError,
    FailedToSerializeUrlError,
    InvalidSignerDataError,
    NoFallbackSignerError,
} from "@/errors";
import * as QRCode from "qrcode";
import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: {
        dark?: string;
        light?: string;
    };
}

export type CreateNewSignerParams = {
    webAuthnOptions?: webAuthnOptions;
    passKeyName?: string;
    fullDomainSelected?: boolean;
    encryptionSalt?: string;
};

const _flattenPayload = (signerPayload: Signer): Record<string, string> => {
    const optimizedPayload = {
        os: signerPayload.deviceData.os,
        b: signerPayload.deviceData.browser,
        p: signerPayload.deviceData.platform,
        x: signerPayload.publicKeyX,
        y: signerPayload.publicKeyY,
        id: signerPayload.publicKeyId,
        ad: signerPayload.signerAddress,
    };
    const flattened: Record<string, string> = {};

    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    function flattenObject(obj: any, parentKey = "") {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = parentKey ? `${parentKey}_${key}` : key;
            if (value && typeof value === "object" && !Array.isArray(value)) {
                flattenObject(value, fullKey);
            } else {
                // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
                flattened[fullKey] = (value as any).toString();
            }
        }
    }

    flattenObject(optimizedPayload);
    return flattened;
};

/**
 * Creates a new passkey signer for a smart account
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param smartAccountAddress - The address of the smart account
 * @param passKeyName - Optional name for the passkey
 * @param encryptionSalt - Optional encryption salt
 * @param fullDomainSelected - Optional selected the full domain for the passkey
 */
export const createNewSignerWithAccountAddress = async ({
    apiKey,
    baseUrl,
    smartAccountAddress,
    params = {},
}: {
    apiKey: string;
    smartAccountAddress: Address;
    baseUrl?: string;
    params?: CreateNewSignerParams;
}): Promise<Signer> => {
    const api = new API(apiKey, baseUrl);
    const { signer, localPrivateKey } = await _createNewSigner(api, {
        passKeyName: params.passKeyName,
        webAuthnOptions: params.webAuthnOptions,
        fullDomainSelected: params.fullDomainSelected ?? false,
    });

    if (signer.publicKeyId) {
        const { publicKeyId, publicKeyX, publicKeyY, signerAddress } = signer;

        if (!(publicKeyId && publicKeyX && publicKeyY && signerAddress))
            throw new InvalidSignerDataError();

        setPasskeyInStorage(
            smartAccountAddress,
            publicKeyId,
            publicKeyX,
            publicKeyY,
            signerAddress
        );
    } else {
        if (!localPrivateKey) throw new NoFallbackSignerError();

        encryptSignerInStorage(
            smartAccountAddress,
            localPrivateKey as Hex,
            params.encryptionSalt
        );
    }
    return signer;
};

/**
 * Creates a new passkey signer
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param passKeyName - Optional name for the passkey
 * @param encryptionSalt - Optional encryption salt
 * @param fullDomainSelected - Optional selected the full domain for the passkey
 */
export const createNewSigner = async ({
    apiKey,
    baseUrl,
    params = {},
}: {
    apiKey: string;
    baseUrl?: string;
    params?: CreateNewSignerParams;
}): Promise<Signer> => {
    const api = new API(apiKey, baseUrl);
    const { signer } = await _createNewPasskeySigner(api, {
        webAuthnOptions: params.webAuthnOptions,
        passKeyName: params.passKeyName,
        fullDomainSelected: params.fullDomainSelected ?? false,
    });

    return signer;
};

export const serializeUrlWithSignerPayload = async (
    validationPageUrl: string,
    signerPayload: Signer
) => {
    try {
        const url = new URL(validationPageUrl);
        const params = _flattenPayload(signerPayload);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        return url;
    } catch (error) {
        throw new FailedToSerializeUrlError(error as Error);
    }
};

export const generateQRCodeUrl = async (
    validationPageUrl: string,
    signerPayload: Signer,
    options?: QRCodeOptions
) => {
    try {
        const serializedUrl = await serializeUrlWithSignerPayload(
            validationPageUrl,
            signerPayload
        );
        const qrCodeImageUrl = await QRCode.toDataURL(
            serializedUrl.toString(),
            {
                width: options?.width || 200,
                margin: options?.margin || 4,
                color: {
                    dark: options?.color?.dark || "#000000ff",
                    light: options?.color?.light || "#ffffffff",
                },
            }
        );
        return qrCodeImageUrl;
    } catch (error) {
        throw new FailedToGenerateQRCodeError(error as Error);
    }
};

const _createNewPasskeySigner = async (
    api: API,
    {
        passKeyName,
        webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
        fullDomainSelected = false,
    }: {
        passKeyName?: string;
        webAuthnOptions?: webAuthnOptions;
        fullDomainSelected: boolean;
    }
): Promise<{
    signer: Signer;
    localPrivateKey?: string;
}> => {
    const webAuthnCompatible = await isWebAuthnCompatible(webAuthnOptions);

    if (!webAuthnCompatible || isFallbackSigner())
        throw new DeviceNotCompatibleWithPasskeysError();

    const passkeyWithCoordinates = await createPasskeySigner({
        api,
        webAuthnOptions,
        passKeyName,
        fullDomainSelected,
    });

    if (passkeyWithCoordinates.publicKeyAlgorithm !== -7)
        throw new DeviceNotCompatibleWithSECKP256r1PasskeysError();

    return {
        signer: {
            signerAddress: passkeyWithCoordinates.signerAddress,
            deviceData: getDeviceData(),
            publicKeyId: passkeyWithCoordinates.id,
            publicKeyX: passkeyWithCoordinates.pubkeyCoordinates.x,
            publicKeyY: passkeyWithCoordinates.pubkeyCoordinates.y,
        },
    };
};

const _createNewSigner = async (
    api: API,
    {
        passKeyName,
        webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
        fullDomainSelected = false,
    }: {
        passKeyName?: string;
        webAuthnOptions?: webAuthnOptions;
        fullDomainSelected: boolean;
    }
): Promise<{
    signer: Signer;
    localPrivateKey?: string;
}> => {
    const webAuthnCompatible = await isWebAuthnCompatible(webAuthnOptions);

    if (webAuthnCompatible && !isFallbackSigner()) {
        const passkeyWithCoordinates = await createPasskeySigner({
            api,
            webAuthnOptions,
            passKeyName,
            fullDomainSelected,
        });

        if (passkeyWithCoordinates.publicKeyAlgorithm === -7) {
            return {
                signer: {
                    signerAddress: passkeyWithCoordinates.signerAddress,
                    deviceData: getDeviceData(),
                    publicKeyId: passkeyWithCoordinates.id,
                    publicKeyX: passkeyWithCoordinates.pubkeyCoordinates.x,
                    publicKeyY: passkeyWithCoordinates.pubkeyCoordinates.y,
                },
            };
        }
    }

    const privateKey = generatePrivateKey();
    const signer = privateKeyToAccount(privateKey);

    return {
        signer: {
            signerAddress: signer.address,
            deviceData: getDeviceData(),
        },
        localPrivateKey: privateKey,
    };
};
