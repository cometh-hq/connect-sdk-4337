import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem/accounts";
import * as utils from "../../../services/utils";

import type { Hex } from "viem";
import * as cryptolib from "./cryptoService";
import { getRandomIV } from "./randomIvService";

export type fallbackStorageValues = {
    encryptedPrivateKey: string;
    iv: string;
};

export const defaultEncryptionSalt = "COMETH-CONNECT";
export const Pbkdf2Iterations = 1000000;

export const encryptSignerInStorage = async (
    walletAddress: Address,
    privateKey: Hex,
    salt?: string
): Promise<void> => {
    const { encryptedPrivateKey, iv } = await encryptEoaFallback(
        walletAddress,
        privateKey,
        salt || defaultEncryptionSalt
    );

    const signer = privateKeyToAccount(privateKey);

    const storageValue = formatStorageValue(
        encryptedPrivateKey,
        iv,
        signer.address
    );

    window.localStorage.setItem(
        `cometh-connect-fallback-${walletAddress}`,
        storageValue
    );
};

export const getSignerLocalStorage = async (
    walletAddress: Address,
    salt?: string
): Promise<Hex | null> => {
    const localStorage = window.localStorage.getItem(
        `cometh-connect-fallback-${walletAddress}`
    );

    if (localStorage) {
        const { encryptedPrivateKey, iv } = unFormatStorageValue(localStorage);

        const privateKey = await decryptEoaFallback(
            walletAddress,
            utils.base64ToArrayBuffer(encryptedPrivateKey),
            utils.base64toUint8Array(iv),
            salt || defaultEncryptionSalt
        );

        return privateKey;
    }

    return null;
};

const encryptEoaFallback = async (
    walletAddress: Address,
    privateKey: Hex,
    salt: string
): Promise<{ encryptedPrivateKey: string; iv: string }> => {
    const encodedWalletAddress = utils.encodeUTF8(walletAddress);
    const encodedSalt = utils.encodeUTF8(salt);

    const encryptionKey = await cryptolib.pbkdf2(
        encodedWalletAddress,
        encodedSalt,
        Pbkdf2Iterations
    );

    const encodedPrivateKey = utils.encodeUTF8(privateKey);

    const iv = getRandomIV();

    const encryptedPrivateKey = await cryptolib.encryptAESCBC(
        encryptionKey,
        iv,
        encodedPrivateKey
    );

    return {
        encryptedPrivateKey: utils.arrayBufferToBase64(encryptedPrivateKey),
        iv: utils.uint8ArrayToBase64(iv),
    };
};

const decryptEoaFallback = async (
    walletAddress: Address,
    encryptedPrivateKey: ArrayBuffer,
    iv: ArrayBuffer,
    salt: string
): Promise<`0x${string}`> => {
    const encodedWalletAddress = utils.encodeUTF8(walletAddress);
    const encodedSalt = utils.encodeUTF8(salt);

    const encryptionKey = await cryptolib.pbkdf2(
        encodedWalletAddress,
        encodedSalt,
        Pbkdf2Iterations
    );

    const privateKey = await cryptolib.decryptAESCBC(
        encryptionKey,
        iv,
        encryptedPrivateKey
    );

    return utils.decodeUTF8(privateKey) as `0x${string}`;
};

const formatStorageValue = (
    encryptedPrivateKey: string,
    iv: string,
    walletAddress: Address
): string => {
    return JSON.stringify({
        encryptedPrivateKey,
        iv,
        walletAddress,
    });
};

const unFormatStorageValue = (storageValue: string): fallbackStorageValues => {
    return JSON.parse(storageValue);
};

export default {
    encryptEoaFallback,
    decryptEoaFallback,
    formatStorageValue,
    unFormatStorageValue,
    getSignerLocalStorage,
    encryptSignerInStorage,
};
