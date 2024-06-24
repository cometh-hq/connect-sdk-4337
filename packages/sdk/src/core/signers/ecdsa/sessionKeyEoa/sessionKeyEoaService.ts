import { type Address, privateKeyToAccount } from "viem/accounts";

import * as utils from "../../../services/utils";

import { querySessionFrom4337ModuleAddress } from "@/core/actions/accounts/safe/sessionKeyActions";
import type { Chain, Hex } from "viem";
import type { FallbackEoaSigner } from "../../types";
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

export const getSessionKeySigner = async ({
    chain,
    safe4337SessionKeysModule,
    rpcUrl,
    smartAccountAddress,
}: {
    smartAccountAddress?: Address;
    chain: Chain;
    safe4337SessionKeysModule: Address;
    rpcUrl?: string;
}): Promise<FallbackEoaSigner | undefined> => {
    if (!smartAccountAddress) return undefined;

    const privateKey =
        await getSessionKeySignerFromLocalStorage(smartAccountAddress);

    if (!privateKey) return undefined;

    const signer = privateKeyToAccount(privateKey);

    const session = await querySessionFrom4337ModuleAddress({
        chain,
        smartAccountAddress,
        safe4337SessionKeysModule,
        sessionKey: signer.address,
        rpcUrl,
    });

    if (session.revoked) throw new Error("Session key has been revoked");

    const now = new Date();
    const validAfter = new Date(session.validAfter);
    const validUntil = new Date(session.validUntil);

    if (validAfter > now) throw new Error("Session key is not yet valid");
    if (validUntil < now) throw new Error("Session key is expired");

    return {
        type: "localWallet",
        eoaFallback: {
            privateKey,
            signer: privateKeyToAccount(privateKey),
            encryptionSalt: defaultEncryptionSalt,
        },
    };
};
