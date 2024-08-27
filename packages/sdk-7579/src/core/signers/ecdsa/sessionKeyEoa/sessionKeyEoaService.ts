import type { Address } from "viem/accounts";

import * as utils from "@/core/services/utils";

import type { Hex } from "viem";

import {
    decryptEoaFallback,
    defaultEncryptionSalt,
    encryptSigner,
    unFormatStorageValue,
} from "../services/ecdsaService";

export const encryptSessionKeyInStorage = async (
    smartAccountAddress: Address,
    privateKey: Hex,
    salt?: string
): Promise<void> => {
    const storageValue = await encryptSigner(
        smartAccountAddress,
        privateKey,
        salt
    );

    window.localStorage.setItem(
        `cometh-connect-sessionKey-${smartAccountAddress}`,
        storageValue
    );
};

export const getSessionKeySignerFromLocalStorage = async (
    smartAccountAddress: Address,
    salt?: string
): Promise<Hex | null> => {
    const localStorage = window.localStorage.getItem(
        `cometh-connect-sessionKey-${smartAccountAddress}`
    );

    if (localStorage) {
        const { encryptedPrivateKey, iv } = unFormatStorageValue(localStorage);

        return await decryptEoaFallback(
            smartAccountAddress,
            utils.base64ToArrayBuffer(encryptedPrivateKey),
            utils.base64toUint8Array(iv),
            salt || defaultEncryptionSalt
        );
    }

    return null;
};

export const deleteSessionKeyInStorage = (
    smartAccountAddress: Address
): void => {
    window.localStorage.removeItem(
        `cometh-connect-sessionKey-${smartAccountAddress}`
    );
};
