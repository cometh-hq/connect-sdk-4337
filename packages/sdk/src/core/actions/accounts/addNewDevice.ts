import { API } from "@/core/services/API";
import { getDeviceData } from "@/core/services/deviceService";
import { isFallbackSigner } from "@/core/signers/createSigner";
import { encryptSignerInStorage } from "@/core/signers/ecdsa/services/ecdsaService";
import {
    createPasskeySigner,
    setPasskeyInStorage,
    sign,
} from "@/core/signers/passkeys/passkeyService";
import type { webAuthnOptions } from "@/core/signers/passkeys/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    assertValidHash,
    isWebAuthnCompatible,
    parseHex,
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
    hash?: Hex;
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
 * @param hash - Optional 32-byte 0x-prefixed hash. When provided, the freshly
 * created passkey signs it in a second WebAuthn ceremony and the resulting
 * signature is returned alongside the signer. Disables the EOA fallback:
 * throws DeviceNotCompatibleWithPasskeysError if WebAuthn is unavailable.
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
}): Promise<Signer & { signature?: Hex }> => {
    if (params.hash) assertValidHash(params.hash);

    const api = new API(apiKey, baseUrl);
    const signerOptions = {
        passKeyName: params.passKeyName,
        webAuthnOptions: params.webAuthnOptions,
        fullDomainSelected: params.fullDomainSelected ?? false,
    };
    const { signer, localPrivateKey } = params.hash
        ? await _createNewPasskeySigner(api, signerOptions)
        : await _createNewSigner(api, signerOptions);

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

    if (!params.hash) return signer;
    if (!signer.publicKeyId) throw new InvalidSignerDataError();

    const signature = await _signHashWithPasskey({
        hash: params.hash,
        publicKeyId: signer.publicKeyId,
        fullDomainSelected: params.fullDomainSelected ?? false,
        tauriOptions: params.webAuthnOptions?.tauriOptions,
    });

    return { ...signer, signature };
};

/**
 * Creates a new passkey signer
 * @param apiKey - The API key for authentication
 * @param baseUrl - Optional base URL for the API
 * @param passKeyName - Optional name for the passkey
 * @param encryptionSalt - Optional encryption salt
 * @param fullDomainSelected - Optional selected the full domain for the passkey
 * @param hash - Optional 32-byte 0x-prefixed hash. When provided, the freshly
 * created passkey signs it in a second WebAuthn ceremony and the resulting
 * signature is returned alongside the signer.
 */
export const createNewSigner = async ({
    apiKey,
    baseUrl,
    params = {},
}: {
    apiKey: string;
    baseUrl?: string;
    params?: CreateNewSignerParams;
}): Promise<Signer & { signature?: Hex }> => {
    if (params.hash) assertValidHash(params.hash);

    const api = new API(apiKey, baseUrl);
    const { signer } = await _createNewPasskeySigner(api, {
        webAuthnOptions: params.webAuthnOptions,
        passKeyName: params.passKeyName,
        fullDomainSelected: params.fullDomainSelected ?? false,
    });

    if (!params.hash) return signer;
    if (!signer.publicKeyId) throw new InvalidSignerDataError();

    const signature = await _signHashWithPasskey({
        hash: params.hash,
        publicKeyId: signer.publicKeyId,
        fullDomainSelected: params.fullDomainSelected ?? false,
        tauriOptions: params.webAuthnOptions?.tauriOptions,
    });

    return { ...signer, signature };
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

const _signHashWithPasskey = async ({
    hash,
    publicKeyId,
    fullDomainSelected,
    tauriOptions,
}: {
    hash: Hex;
    publicKeyId: Hex;
    fullDomainSelected: boolean;
    tauriOptions?: webAuthnOptions["tauriOptions"];
}): Promise<Hex> => {
    const publicKeyCredential = [
        { id: parseHex(publicKeyId), type: "public-key" },
    ] as PublicKeyCredentialDescriptor[];

    const { signature } = await sign({
        challenge: hash,
        publicKeyCredential,
        fullDomainSelected,
        tauriOptions,
    });

    return signature;
};
