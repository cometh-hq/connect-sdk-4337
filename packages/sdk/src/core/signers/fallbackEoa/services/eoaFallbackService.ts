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

const encryptSigner = async (
    smartAccountAddress: Address,
    privateKey: Hex,
    salt?: string
): Promise<string> => {
    const { encryptedPrivateKey, iv } = await encryptEoaFallback(
        smartAccountAddress,
        privateKey,
        salt || defaultEncryptionSalt
    );

    const signer = privateKeyToAccount(privateKey);

    const storageValue = formatStorageValue(
        encryptedPrivateKey,
        iv,
        signer.address
    );

    return storageValue;
};

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

export const encryptSignerInStorage = async (
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
        `cometh-connect-fallback-${smartAccountAddress}`,
        storageValue
    );
};

export const getSignerLocalStorage = async (
    smartAccountAddress: Address,
    salt?: string
): Promise<Hex | null> => {
    const localStorage = window.localStorage.getItem(
        `cometh-connect-fallback-${smartAccountAddress}`
    );

    if (localStorage) {
        const { encryptedPrivateKey, iv } = unFormatStorageValue(localStorage);

        const privateKey = await decryptEoaFallback(
            smartAccountAddress,
            utils.base64ToArrayBuffer(encryptedPrivateKey),
            utils.base64toUint8Array(iv),
            salt || defaultEncryptionSalt
        );

        return privateKey;
    }

    return null;
};

const encryptEoaFallback = async (
    smartAccountAddress: Address,
    privateKey: Hex,
    salt: string
): Promise<{ encryptedPrivateKey: string; iv: string }> => {
    const encodedSmartAccountAddress = utils.encodeUTF8(smartAccountAddress);
    const encodedSalt = utils.encodeUTF8(salt);

    const encryptionKey = await cryptolib.pbkdf2(
        encodedSmartAccountAddress,
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
    smartAccountAddress: Address,
    encryptedPrivateKey: ArrayBuffer,
    iv: ArrayBuffer,
    salt: string
): Promise<`0x${string}`> => {
    const encodedsmartAccountAddress = utils.encodeUTF8(smartAccountAddress);
    const encodedSalt = utils.encodeUTF8(salt);

    const encryptionKey = await cryptolib.pbkdf2(
        encodedsmartAccountAddress,
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
    signerAddress: Address
): string => {
    return JSON.stringify({
        encryptedPrivateKey,
        iv,
        signerAddress,
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
