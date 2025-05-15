import {
    DeviceNotCompatibleWithPasskeysError,
    DeviceNotCompatibleWithSECKP256r1PasskeysError,
    FailedToGenerateQRCodeError,
    FailedToSerializeUrlError,
} from "@/errors";
import { API } from "@/services/API";
import { getDeviceData } from "@/services/deviceService";
import { createPasskey } from "@/signers/passkeyService/passkey";
import type { webAuthnOptions } from "@/signers/passkeyService/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "@/signers/passkeyService/utils";
import type { PasskeyObject } from "@/types";
import * as QRCode from "qrcode";

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

const _flattenPayload = (
    signerPayload: PasskeyObject
): Record<string, string> => {
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
 * Creates a new passkey signer
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param passKeyName - Optional name for the passkey
 * @param encryptionSalt - Optional encryption salt
 * @param fullDomainSelected - Optional selected the full domain for the passkey
 */
export const createNewPasskeySigner = async ({
    apiKey,
    baseUrl,
    params = {},
}: {
    apiKey: string;
    baseUrl?: string;
    params?: CreateNewSignerParams;
}): Promise<PasskeyObject> => {
    const api = new API(apiKey, baseUrl);
    const { passkeyObject } = await _createNewPasskeySigner(api, {
        webAuthnOptions: params.webAuthnOptions,
        passKeyName: params.passKeyName,
        fullDomainSelected: params.fullDomainSelected ?? false,
    });

    return passkeyObject;
};

export const serializeUrlWithSignerPayload = async (
    validationPageUrl: string,
    signerPayload: PasskeyObject
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
    signerPayload: PasskeyObject,
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
    passkeyObject: PasskeyObject;
}> => {
    const webAuthnCompatible = await isWebAuthnCompatible(webAuthnOptions);

    if (!webAuthnCompatible) throw new DeviceNotCompatibleWithPasskeysError();

    const passkeyWithCoordinates = await createPasskey({
        api,
        webAuthnOptions,
        passKeyName,
        fullDomainSelected,
    });

    if (passkeyWithCoordinates.publicKeyAlgorithm !== -7)
        throw new DeviceNotCompatibleWithSECKP256r1PasskeysError();

    return {
        passkeyObject: {
            signerAddress: passkeyWithCoordinates.signerAddress,
            deviceData: getDeviceData(),
            publicKeyId: passkeyWithCoordinates.id,
            publicKeyX: passkeyWithCoordinates.pubkeyCoordinates.x,
            publicKeyY: passkeyWithCoordinates.pubkeyCoordinates.y,
        },
    };
};
