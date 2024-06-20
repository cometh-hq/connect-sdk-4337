import { NoFallbackSignerError } from "@/errors";
import type { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { SafeContractConfig } from "../accounts/safe/types";
import { API } from "../services/API";
import { getDeviceData } from "../services/deviceService";
import { isFallbackSigner } from "../signers/createSigner";
import { encryptSignerInStorage } from "../signers/fallbackEoa/services/eoaFallbackService";
import {
    createPasskeySigner,
    setPasskeyInStorage,
} from "../signers/passkeys/passkeyService";
import type { webAuthnOptions } from "../signers/passkeys/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "../signers/passkeys/utils";
import {
    type NewSignerRequest,
    type NewSignerRequestBody,
    NewSignerRequestType,
} from "../types";

export const useSignerRequests = async (apiKey: string, baseUrl?: string) => {
    const api = new API(apiKey, baseUrl);

    const { safeWebAuthnSharedSignerAddress } =
        (await api.getContractParams()) as SafeContractConfig;

    const _createNewSigner = async (
        smartAccountAddress: Address,
        passKeyName?: string,
        webAuthnOptions: webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS
    ): Promise<{
        addNewSignerRequest: NewSignerRequestBody;
        localPrivateKey?: string;
    }> => {
        const webAuthnCompatible = await isWebAuthnCompatible(webAuthnOptions);

        if (webAuthnCompatible && !isFallbackSigner()) {
            const passkeyWithCoordinates = await createPasskeySigner({
                webAuthnOptions,
                passKeyName,
                safeWebAuthnSharedSignerAddress,
            });

            if (passkeyWithCoordinates.publicKeyAlgorithm === -7) {
                return {
                    addNewSignerRequest: {
                        smartAccountAddress,
                        signerAddress: passkeyWithCoordinates.signerAddress,
                        deviceData: getDeviceData(),
                        type: NewSignerRequestType.WEBAUTHN,
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
            addNewSignerRequest: {
                smartAccountAddress,
                signerAddress: signer.address,
                deviceData: getDeviceData(),
                type: NewSignerRequestType.FALLBACK_WALLET,
            },
            localPrivateKey: privateKey,
        };
    };

    const initNewSignerRequest = async ({
        smartAccountAddress,
        passKeyName,
        encryptionSalt,
    }: {
        smartAccountAddress: Address;
        passKeyName?: string;
        encryptionSalt?: string;
    }): Promise<NewSignerRequestBody> => {
        const { addNewSignerRequest, localPrivateKey } = await _createNewSigner(
            smartAccountAddress,
            passKeyName
        );

        if (addNewSignerRequest.type === NewSignerRequestType.WEBAUTHN) {
            const { publicKeyId, publicKeyX, publicKeyY, signerAddress } =
                addNewSignerRequest;

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

        return addNewSignerRequest;
    };

    const getNewSignerRequests = async (
        smartAccountAddress: Address
    ): Promise<NewSignerRequest[] | null> => {
        return await api.getNewSignerRequests(smartAccountAddress);
    };

    return { initNewSignerRequest, getNewSignerRequests };
};
