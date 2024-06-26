import { NoFallbackSignerError } from "@/errors";
import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

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

    return { createNewSigner, retrieveAccountAddressFromPasskey };
};
