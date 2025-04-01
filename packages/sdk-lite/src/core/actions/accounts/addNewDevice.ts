import type { Signer } from "@/core/types";
import {
    FailedToGenerateQRCodeError,
    FailedToSerializeUrlError,
} from "@/errors";
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