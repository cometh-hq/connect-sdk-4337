import type { Address, Chain } from "viem";
import type { eoaFallback } from "./ecdsa/fallbackEoa/types";
import type {
    PasskeyLocalStorageFormat,
    webAuthnOptions,
} from "./passkeys/types";

interface Signer {
    type: "localWallet" | "passkey";
}

export interface FallbackEoaSigner extends Signer {
    type: "localWallet";
    eoaFallback: eoaFallback;
}

export interface PasskeySigner extends Signer {
    type: "passkey";
    passkey: PasskeyLocalStorageFormat;
}

export type ComethSigner = FallbackEoaSigner | PasskeySigner;

export type SignerConfig = {
    disableEoaFallback?: boolean;
    encryptionSalt?: string;
    webAuthnOptions?: webAuthnOptions;
    passKeyName?: string;
};

export type CreateSignerParams = {
    apiKey: string;
    chain: Chain;
    smartAccountAddress?: Address;
    baseUrl?: string;
    rpcUrl?: string;
    safeWebAuthnSharedSignerAddress: Address;
} & SignerConfig;
