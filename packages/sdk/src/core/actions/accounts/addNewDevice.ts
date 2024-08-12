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
import { NoFallbackSignerError } from "@/errors";
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
 * Creates a new signer for a smart account
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param smartAccountAddress - The address of the smart account
 * @param passKeyName - Optional name for the passkey
 * @param encryptionSalt - Optional encryption salt
 */
export const createNewSignerWithAccountAddress = async (
    apiKey: string,
    baseUrl: string | undefined,
    smartAccountAddress: Address,
    params: CreateNewSignerParams = {}
): Promise<Signer> => {
    const api = new API(apiKey, baseUrl);
    const { signer, localPrivateKey } = await _createNewSigner(api, {
        passKeyName: params.passKeyName,
        webAuthnOptions: params.webAuthnOptions,
    });

    if (signer.publicKeyId) {
        const { publicKeyId, publicKeyX, publicKeyY, signerAddress } = signer;

        if (!(publicKeyId && publicKeyX && publicKeyY && signerAddress))
            throw new Error("Invalid signer data");

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
 * Creates a new signer for a smart account
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param passKeyName - Optional name for the passkey
 * @param encryptionSalt - Optional encryption salt
 */
export const createNewSigner = async (
    apiKey: string,
    baseUrl: string | undefined,
    params: CreateNewSignerParams = {}
): Promise<Signer> => {
    const api = new API(apiKey, baseUrl);
    const { signer } = await _createNewPasskeySigner(api, {
        webAuthnOptions: params.webAuthnOptions,
        passKeyName: params.passKeyName,
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
        throw new Error(`Failed to serialize url: ${error}`);
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
        throw new Error(`Failed to generate QR Code: ${error}`);
    }
};

const _createNewPasskeySigner = async (
    api: API,
    {
        passKeyName,
        webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
    }: {
        passKeyName?: string;
        webAuthnOptions?: webAuthnOptions;
    }
): Promise<{
    signer: Signer;
    localPrivateKey?: string;
}> => {
    const webAuthnCompatible = await isWebAuthnCompatible(webAuthnOptions);

    if (!webAuthnCompatible || isFallbackSigner())
        throw new Error("Device not compatible with passkeys");

    const passkeyWithCoordinates = await createPasskeySigner({
        api,
        webAuthnOptions,
        passKeyName,
    });

    if (passkeyWithCoordinates.publicKeyAlgorithm !== -7)
        throw new Error("Device not compatible with SECKP256r1 passkeys");

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
    }: {
        passKeyName?: string;
        webAuthnOptions?: webAuthnOptions;
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
