import { NoFallbackSignerError } from "@/errors";
import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import * as QRCode from "qrcode";
import { API } from "../services/API";
import { getDeviceData } from "../services/deviceService";
import { isFallbackSigner } from "../signers/createSigner";
import { encryptSignerInStorage } from "../signers/ecdsa/services/ecdsaService";
import {
    createPasskeySigner,
    retrieveSmartAccountAddressFromPasskey,
    setPasskeyInStorage,
} from "../signers/passkeys/passkeyService";
import type { webAuthnOptions } from "../signers/passkeys/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "../signers/passkeys/utils";
import type { Signer } from "../types";

interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: {
        dark?: string;
        light?: string;
    };
}

export const useHandleDevice = (apiKey: string, baseUrl?: string) => {
    const api = new API(apiKey, baseUrl);

    const _createNewSigner = async ({
        passKeyName,
        webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
    }: {
        passKeyName?: string;
        webAuthnOptions?: webAuthnOptions;
    }): Promise<{
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

    const createNewSigner = async ({
        smartAccountAddress,
        passKeyName,
        encryptionSalt,
    }: {
        smartAccountAddress: Address;
        passKeyName?: string;
        encryptionSalt?: string;
    }): Promise<Signer> => {
        const { signer, localPrivateKey } = await _createNewSigner({
            passKeyName,
        });

        if (signer.publicKeyId) {
            const { publicKeyId, publicKeyX, publicKeyY, signerAddress } =
                signer;

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
                encryptionSalt
            );
        }
        return signer;
    };

    /**
     * Function used to retrieve an account address from a passkey
     * @param apiKey
     */
    const retrieveAccountAddressFromPasskey = async (): Promise<Address> => {
        return await retrieveSmartAccountAddressFromPasskey(api);
    };

    const _flattenPayload = (signerPayload: Signer): Record<string, string> => {
        const flattened: Record<string, string> = {};

        // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        function flattenObject(obj: any, parentKey = "") {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = parentKey ? `${parentKey}_${key}` : key;
                if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {
                    flattenObject(value, fullKey);
                } else {
                    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
                    flattened[fullKey] = (value as any).toString();
                }
            }
        }

        flattenObject(signerPayload);
        return flattened;
    };

    const serializeUrlWithSignerPayload = async (
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

    const generateQRCodeUrl = async (
        validationPageUrl: string,
        signerPayload: Signer,
        options?: QRCodeOptions
    ) => {
        try {
            const serializedUrl = serializeUrlWithSignerPayload(
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

    return {
        createNewSigner,
        retrieveAccountAddressFromPasskey,
        serializeUrlWithSignerPayload,
        generateQRCodeUrl,
    };
};
