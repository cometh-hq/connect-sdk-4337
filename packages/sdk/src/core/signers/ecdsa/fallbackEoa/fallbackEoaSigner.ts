import {
    type Address,
    generatePrivateKey,
    privateKeyToAccount,
} from "viem/accounts";

import type { Hex, PrivateKeyAccount } from "viem";
import { getSignerLocalStorage } from "../services/ecdsaService";
import { NoPrivateKeyFoundError } from "@/errors";

export const getFallbackEoaSigner = async ({
    smartAccountAddress,
    encryptionSalt,
}: {
    smartAccountAddress: Address;
    encryptionSalt?: string;
}): Promise<{ privateKey: Hex; signer: PrivateKeyAccount }> => {
    const privateKey = await getSignerLocalStorage(
        smartAccountAddress,
        encryptionSalt
    );

    if (!privateKey) throw new NoPrivateKeyFoundError();

    return { privateKey, signer: privateKeyToAccount(privateKey) };
};

export const createFallbackEoaSigner = async (): Promise<{
    privateKey: Hex;
    signer: PrivateKeyAccount;
}> => {
    const privateKey = generatePrivateKey();
    const signer = privateKeyToAccount(privateKey);

    return { signer, privateKey };
};
