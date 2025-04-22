import type { Address } from "viem/accounts";

import type { Hex, PrivateKeyAccount } from "viem";

import {
    createFallbackEoaSigner,
    getFallbackEoaSigner,
} from "./ecdsa/fallbackEoa/fallbackEoaSigner";
import {
    createPasskeySigner,
    getPasskeySigner,
    setPasskeyInStorage,
} from "./passkeys/passkeyService";

import { API } from "@/services/API";
import {
    encryptSignerInStorage,
    getSignerLocalStorage,
} from "./ecdsa/services/ecdsaService";

import {
    DeviceNotCompatibleWithPasskeysError,
    PasskeySignerNotValidError,
} from "@/errors";
import type {
    PasskeyLocalStorageFormat,
    webAuthnOptions,
} from "./passkeys/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "./passkeys/utils";
import type { ComethSigner, CreateSignerParams, Signer } from "./types";

export const isComethSigner = (signer: Signer): signer is ComethSigner => {
    return (
        "type" in signer &&
        (signer.type === "localWallet" || signer.type === "passkey")
    );
};

export const getSignerAddress = (customSigner: Signer) => {
    if (isComethSigner(customSigner)) {
        return customSigner.type === "localWallet"
            ? customSigner.eoaFallback.signer.address
            : customSigner.passkey.signerAddress;
    }

    return customSigner.address;
};

export const getSigner = (customSigner: Signer) => {
    if (isComethSigner(customSigner)) {
        if (customSigner.type === "passkey")
            throw new PasskeySignerNotValidError();

        return customSigner.eoaFallback.signer;
    }

    return customSigner;
};

export const saveSigner = async (
    signer: Signer,
    smartAccountAddress: Address
) => {
    if (isComethSigner(signer)) {
        if (signer.type === "localWallet") {
            const storedEncryptedPK = await getSignerLocalStorage(
                smartAccountAddress,
                signer.eoaFallback.encryptionSalt
            );

            if (!storedEncryptedPK)
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
        }
    }
};

export const throwErrorWhenEoaFallbackDisabled = (
    disableEoaFallback: boolean
): void => {
    if (disableEoaFallback) throw new DeviceNotCompatibleWithPasskeysError();
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

    return webAuthnCompatible && !isFallbackSigner();
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
    publicClient,
    smartAccountAddress,
    baseUrl,
    disableEoaFallback = false,
    encryptionSalt,
    webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
    passKeyName,
    fullDomainSelected = false,
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
                fullDomainSelected,
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
                publicClient,
                safeModuleSetUpAddress: safeContractParams.setUpContractAddress,
                safeProxyFactoryAddress:
                    safeContractParams.safeProxyFactoryAddress,
                safeSingletonAddress: safeContractParams.safeSingletonAddress,
                fallbackHandler: safeContractParams.fallbackHandler as Address,
                p256Verifier: safeContractParams.p256Verifier,
                multisendAddress: safeContractParams.multisendAddress,
                safeWebAuthnSharedSignerAddress:
                    safeContractParams.safeWebAuthnSharedSignerContractAddress,
                fullDomainSelected,
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
    let signer: PrivateKeyAccount;

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
