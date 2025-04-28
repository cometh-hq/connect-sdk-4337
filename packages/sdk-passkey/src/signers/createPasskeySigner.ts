import type { Address } from "viem/accounts";

import {
    createPasskey,
    getPasskeySigner,
    setPasskeyInStorage,
} from "./passkeys/passkeyService";

import { API } from "@/services/API";

import { DeviceNotCompatibleWithPasskeysError } from "@/errors";
import type {
    PasskeyLocalStorageFormat,
    webAuthnOptions,
} from "./passkeys/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "./passkeys/utils";
import type { CreateSignerParams, PasskeySigner } from "./types";

export const saveSigner = async (
    signer: PasskeySigner,
    smartAccountAddress: Address
) => {
    setPasskeyInStorage(
        smartAccountAddress,
        signer.passkey.id,
        signer.passkey.pubkeyCoordinates.x,
        signer.passkey.pubkeyCoordinates.y,
        signer.passkey.signerAddress
    );
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
 * Helper to create the Passkey Signer
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
}: CreateSignerParams): Promise<PasskeySigner> {
    const api = new API(apiKey, baseUrl);

    const passkeyCompatible = await isDeviceCompatibleWithPasskeys({
        webAuthnOptions,
    });

    if (!safeContractParams) {
        const contractParams = await api.getProjectParams(chain.id);
        safeContractParams = contractParams.safeContractParams;
    }

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
                throw new DeviceNotCompatibleWithPasskeysError();
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

        const passkeySigner = {
            type: "passkey",
            passkey,
        } as PasskeySigner;

        return passkeySigner;
    }
    throw new DeviceNotCompatibleWithPasskeysError();
}
