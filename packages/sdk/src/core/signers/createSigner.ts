import type { Address } from "viem/accounts";

import type { Hex } from "viem";

import type { SmartAccountSigner } from "permissionless/accounts";
import {
    createFallbackEoaSigner,
    getFallbackEoaSigner,
} from "./ecdsa/fallbackEoa/fallbackEoaSigner";
import {
    createPasskeySigner,
    getPasskeySigner,
    setPasskeyInStorage,
} from "./passkeys/passkeyService";

import { API } from "@/core/services/API";
import { encryptSignerInStorage } from "./ecdsa/services/ecdsaService";

import { getDeviceData } from "@/core/services/deviceService";
import type {
    PasskeyLocalStorageFormat,
    webAuthnOptions,
} from "./passkeys/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "./passkeys/utils";
import type { ComethSigner, CreateSignerParams } from "./types";

export const saveSigner = async (
    api: API,
    signer: ComethSigner,
    smartAccountAddress: Address
) => {
    if (signer.type === "localWallet") {
        await encryptSignerInStorage(
            smartAccountAddress,
            signer.eoaFallback.privateKey,
            signer.eoaFallback.encryptionSalt
        );
    } else {
        setPasskeyInStorage(
            smartAccountAddress,
            signer.passkey.id,
            signer.passkey.pubkeyCoordinates.x,
            signer.passkey.pubkeyCoordinates.y,
            signer.passkey.signerAddress
        );

        await api.createWebAuthnSigner({
            walletAddress: smartAccountAddress,
            publicKeyId: signer.passkey.id,
            publicKeyX: signer.passkey.pubkeyCoordinates.x,
            publicKeyY: signer.passkey.pubkeyCoordinates.y,
            deviceData: getDeviceData(),
            signerAddress: signer.passkey.signerAddress,
            isSharedWebAuthnSigner: true,
        });
    }
};

const throwErrorWhenEoaFallbackDisabled = (
    disableEoaFallback: boolean
): void => {
    if (disableEoaFallback)
        throw new Error("Passkeys are not compatible with your device");
};

export const isFallbackSigner = (): boolean => {
    const fallbackSigner = Object.keys(localStorage).find((key) =>
        key.startsWith("cometh-connect-fallback-")
    );
    return !!fallbackSigner;
};

export const isDeviceCompatibleWithPasskeys = async (options: {
    webAuthnOptions: webAuthnOptions;
}) => {
    const webAuthnCompatible = await isWebAuthnCompatible(
        options.webAuthnOptions
    );

    if (webAuthnCompatible && !isFallbackSigner()) {
        return true;
    }

    return false;
};

/**
 * Helper to create the Cometh Signer
 * @param apiKey
 * @param smartAccountAddress
 * @param disableEoaFallback
 * @param encryptionSalt
 * @param webAuthnOptions
 * @param passKeyName
 */
export async function createSigner({
    apiKey,
    chain,
    rpcUrl,
    smartAccountAddress,
    baseUrl,
    disableEoaFallback = false,
    encryptionSalt,
    webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
    passKeyName,
    safeContractParams,
}: CreateSignerParams): Promise<ComethSigner> {
    const api = new API(apiKey, baseUrl);

    const passkeyCompatible = await isDeviceCompatibleWithPasskeys({
        webAuthnOptions,
    });

    if (passkeyCompatible) {
        let passkey: PasskeyLocalStorageFormat;
        if (!smartAccountAddress) {
            passkey = await createPasskeySigner({
                api,
                webAuthnOptions,
                passKeyName,
                safeWebAuthnSharedSignerAddress:
                    safeContractParams.safeWebAuthnSharedSignerContractAddress,
            });

            if (passkey.publicKeyAlgorithm !== -7) {
                console.warn("ECC passkey are not supported by your device");
                throwErrorWhenEoaFallbackDisabled(disableEoaFallback);

                return {
                    type: "localWallet",
                    eoaFallback: await createFallbackEoaSigner(),
                };
            }
        } else {
            passkey = await getPasskeySigner({
                api,
                smartAccountAddress,
                chain,
                rpcUrl,
                safeModuleSetUpAddress: safeContractParams.setUpContractAddress,
                safeProxyFactoryAddress:
                    safeContractParams.safeProxyFactoryAddress,
                safeSingletonAddress: safeContractParams.safeSingletonAddress,
                fallbackHandler: safeContractParams.safe4337SessionKeysModule,
                p256Verifier: safeContractParams.p256Verifier,
                multisendAddress: safeContractParams.multisendAddress,
                safeWebAuthnSharedSignerAddress:
                    safeContractParams.safeWebAuthnSharedSignerContractAddress,
            });
        }

        return {
            type: "passkey",
            passkey,
        };
    }

    console.warn("ECC passkey are not supported by your device");
    throwErrorWhenEoaFallbackDisabled(disableEoaFallback);

    let privateKey: Hex;
    let signer: SmartAccountSigner;

    if (!smartAccountAddress) {
        ({ privateKey, signer } = await createFallbackEoaSigner());
    } else {
        ({ privateKey, signer } = await getFallbackEoaSigner({
            smartAccountAddress,
            encryptionSalt,
        }));
    }

    return {
        type: "localWallet",
        eoaFallback: { privateKey, signer, encryptionSalt },
    };
}
