import type { Hex, PrivateKeyAccount } from "viem";

export type eoaFallback = {
    signer: PrivateKeyAccount;
    privateKey: Hex;
    encryptionSalt?: string;
};
