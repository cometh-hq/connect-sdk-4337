import type { Address, Chain, Client, Transport } from "viem";

import type { ComethSigner } from "@/core/signers/types.js";
import { safeECDSASigner } from "./ecdsa/ecdsa.js";
import type { SafeSigner } from "./types.js";
import { safeWebAuthnSigner } from "./webauthn/webAuthn.js";

type SafeSignerParams = {
    comethSigner: ComethSigner;
    safe4337SessionKeysModule: Address;
    smartAccountAddress: Address;
};

/**
 * Converts a ComethSigner to a SafeSigner
 *
 * This function takes a ComethSigner and converts it to the appropriate SafeSigner
 * based on the signer type (either ECDSA or WebAuthn).
 *
 * @param client - The viem Client instance
 * @param params - SafeSignerParams object containing:
 *   @param comethSigner - The ComethSigner instance to convert
 *   @param safe4337SessionKeysModule - The address of the Safe 4337 session keys module
 *   @param smartAccountAddress - The address of the smart account
 *
 * @returns A Promise that resolves to a SafeSigner instance
 */
export async function comethSignerToSafeSigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        comethSigner,
        safe4337SessionKeysModule,
        smartAccountAddress,
    }: SafeSignerParams
): Promise<SafeSigner> {
    if (comethSigner.type === "localWallet") {
        return {
            ...(await safeECDSASigner(client, {
                signer: comethSigner.eoaFallback.signer,
                safe4337SessionKeysModule,
                smartAccountAddress,
            })),
        };
    }

    return {
        ...(await safeWebAuthnSigner(client, {
            passkey: comethSigner.passkey,
            passkeySignerAddress: comethSigner.passkey.signerAddress,
            safe4337SessionKeysModule,
            smartAccountAddress,
        })),
    };
}
