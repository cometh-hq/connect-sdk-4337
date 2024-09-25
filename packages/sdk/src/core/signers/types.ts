import type { SmartAccountSigner } from "permissionless/accounts";
import type { Address, Chain } from "viem";
import type { SafeContractParams } from "../accounts/safe/types";
import type { eoaFallback } from "./ecdsa/fallbackEoa/types";
import type {
    PasskeyLocalStorageFormat,
    webAuthnOptions,
} from "./passkeys/types";

interface ComethSignerTypes {
    type: "localWallet" | "passkey";
}

export interface FallbackEoaSigner extends ComethSignerTypes {
    type: "localWallet";
    eoaFallback: eoaFallback;
}

export interface PasskeySigner extends ComethSignerTypes {
    type: "passkey";
    passkey: PasskeyLocalStorageFormat;
}

export type ComethSigner = FallbackEoaSigner | PasskeySigner;

export type ComethSignerConfig = {
    disableEoaFallback?: boolean;
    encryptionSalt?: string;
    webAuthnOptions?: webAuthnOptions;
    passKeyName?: string;
};

export type CreateSignerParams = {
    apiKey: string;
    chain: Chain;
    smartAccountAddress?: Address;
    safeContractParams: SafeContractParams;
    baseUrl?: string;
    rpcUrl?: string;
} & ComethSignerConfig;

export type SignerCustom = ComethSigner | SmartAccountSigner<"custom", Address>;
