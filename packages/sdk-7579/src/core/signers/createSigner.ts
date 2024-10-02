import type { Address } from "viem/accounts";

import type { Chain, Hex } from "viem";

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
import {
    encryptSignerInStorage,
    getSignerLocalStorage,
} from "./ecdsa/services/ecdsaService";

import { getDeviceData } from "@/core/services/deviceService";
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
            throw Error("passkey signer not valid");

        return customSigner.eoaFallback.signer;
    }

    return customSigner;
};

export const saveSigner = async (
    chain: Chain,
    api: API,
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

            await api.createWebAuthnSigner({
                chainId: chain.id,
                walletAddress: smartAccountAddress,
                publicKeyId: signer.passkey.id,
                publicKeyX: signer.passkey.pubkeyCoordinates.x,
                publicKeyY: signer.passkey.pubkeyCoordinates.y,
                deviceData: getDeviceData(),
                signerAddress: signer.passkey.signerAddress,
                isSharedWebAuthnSigner: true,
            });
        }
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
                rpcUrl,
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
