import type { SmartAccountSigner } from "permissionless/accounts";
import type { Hex } from "viem";

export type eoaFallback = {
    signer: SmartAccountSigner;
    privateKey: Hex;
    encryptionSalt?: string;
};
