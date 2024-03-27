import type { Address } from "viem/accounts";

import type { Hex } from "viem";

import type { SmartAccountSigner } from "permissionless/accounts";
import {
    createFallbackEoaSigner,
    getFallbackEoaSigner,
} from "./fallbackEoa/fallbackEoaSigner";
import {
    /*     createPasskeySigner,
    getPasskeySigner, */
    setPasskeyInStorage,
} from "./passkeys/passkeyService";

/* import { API } from "../services/API"; */
import { encryptSignerInStorage } from "./fallbackEoa/services/eoaFallbackService";

import type {
    /*     PasskeyLocalStorageFormat, */
    webAuthnOptions,
} from "./passkeys/types";
/* import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "./passkeys/utils"; */
import type { ComethSigner, FallbackEoaSigner } from "./types";

type SignerConfigParams = {
    apiKey: string;
    smartAccountAddress?: Address;
    disableEoaFallback?: boolean;
    encryptionSalt?: string;
    webAuthnOptions?: webAuthnOptions;
    passKeyName?: string;
};

export const saveSignerInStorage = async (
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
            signer.passkey.pubkeyCoordinates.y
        );
    }
};

const throwErrorWhenEoaFallbackDisabled = (
    disableEoaFallback: boolean
): void => {
    if (disableEoaFallback)
        throw new Error("Passkeys are not compatible with your device");
};

/* const _isFallbackSigner = (): boolean => {
    const fallbackSigner = Object.keys(localStorage).find((key) =>
        key.startsWith("cometh-connect-fallback-")
    );
    return !!fallbackSigner;
}; */

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
    /*     apiKey, */
    smartAccountAddress,
    disableEoaFallback = false,
    encryptionSalt,
    /*    webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
    passKeyName, */
}: SignerConfigParams): Promise<FallbackEoaSigner> {
    /* const api = new API(apiKey);
    const webAuthnCompatible = await isWebAuthnCompatible(webAuthnOptions);

    if (webAuthnCompatible && !_isFallbackSigner()) {
        let passkey: PasskeyLocalStorageFormat;
        if (!smartAccountAddress) {
            passkey = await createPasskeySigner(webAuthnOptions, passKeyName);

            if (passkey.publicKeyAlgorithm !== -7) {
                console.warn("ECC passkey are not supported by your device");
                throwErrorWhenEoaFallbackDisabled(disableEoaFallback);

                return {
                    type: "localWallet",
                    eoaFallback: await createFallbackEoaSigner(),
                };
            }
        } else {
            passkey = await getPasskeySigner({ api, smartAccountAddress });
        }

        return {
            type: "passkey",
            passkey,
        };
    } */

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
