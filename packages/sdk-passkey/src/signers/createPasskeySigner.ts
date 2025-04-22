import type { Address } from "viem/accounts";

import {
    createPasskey,
    getPasskeySigner,
    setPasskeyInStorage,
} from "./passkeys/passkeyService";

import { API } from "@/services/API";

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
        (signer.type === "passkey")
    );
};

export const getSignerAddress = (customSigner: Signer) => {
    if (isComethSigner(customSigner)) {
        return customSigner.passkey.signerAddress;
    }

    return customSigner.address;
};

export const saveSigner = async (
    signer: Signer,
    smartAccountAddress: Address
) => {
    if (isComethSigner(signer)) {
        setPasskeyInStorage(
            smartAccountAddress,
            signer.passkey.id,
            signer.passkey.pubkeyCoordinates.x,
            signer.passkey.pubkeyCoordinates.y,
            signer.passkey.signerAddress
        );
    }
};

export const isDeviceCompatibleWithPasskeys = async (options: {
    webAuthnOptions: webAuthnOptions;
}) => {
    const webAuthnCompatible = await isWebAuthnCompatible(
        options.webAuthnOptions
    );

    return webAuthnCompatible;
};

/**
 * Helper to create the Cometh Signer
 * @param apiKey
 * @param smartAccountAddress
 * @param encryptionSalt
 * @param webAuthnOptions
 * @param passKeyName
 */
export async function createPasskeySigner({
    apiKey,
    chain,
    publicClient,
    smartAccountAddress,
    baseUrl,
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
            passkey = await createPasskey({
                api,
                webAuthnOptions,
                passKeyName,
                fullDomainSelected,
                safeWebAuthnSharedSignerAddress:
                    safeContractParams.safeWebAuthnSharedSignerContractAddress,
            });

            if (passkey.publicKeyAlgorithm !== -7) {
                throw new DeviceNotCompatibleWithPasskeysError()
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
    throw new DeviceNotCompatibleWithPasskeysError()
}
