import type { Address, Chain, PrivateKeyAccount, PublicClient } from "viem";
import type { SafeContractParams } from "../accounts/safe/types";
import type {
    PasskeyLocalStorageFormat,
    webAuthnOptions,
} from "./passkeys/types";

export interface PasskeySigner {
    type: "passkey";
    passkey: PasskeyLocalStorageFormat;
}

export type ComethSignerConfig = {
    webAuthnOptions?: webAuthnOptions;
    passKeyName?: string;
    fullDomainSelected?: boolean;
};

export type CreateSignerParams = {
    apiKey: string;
    chain: Chain;
    smartAccountAddress?: Address;
    safeContractParams?: SafeContractParams;
    baseUrl?: string;
    publicClient?: PublicClient;
} & ComethSignerConfig;

export type Signer = PasskeySigner | PrivateKeyAccount;