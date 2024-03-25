import type { eoaFallback } from "./fallbackEoa/types";
import type { PasskeyLocalStorageFormat } from "./passkeys/types";

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
