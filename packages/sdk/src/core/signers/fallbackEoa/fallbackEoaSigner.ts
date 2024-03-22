import {
    type Address,
    generatePrivateKey,
    privateKeyToAccount,
} from "viem/accounts";

import type { Hex, PrivateKeyAccount } from "viem";
import { getSignerLocalStorage } from "./services/eoaFallbackService";

export const getFallbackEoaSigner = async ({
    walletAddress,
    encryptionSalt,
}: {
    walletAddress: Address;
    encryptionSalt?: string;
}): Promise<{ privateKey: Hex; signer: PrivateKeyAccount }> => {
    const privateKey = await getSignerLocalStorage(
        walletAddress,
        encryptionSalt
    );

    if (!privateKey) throw new Error("no account found");

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
