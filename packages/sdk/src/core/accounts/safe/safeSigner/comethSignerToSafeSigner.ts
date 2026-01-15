import type { Address, Chain, Client, Transport } from "viem";

import { safeECDSASigner } from "./ecdsa/ecdsa.js";

import { getSigner, isComethSigner } from "@/core/signers/createSigner.js";
import type { Signer } from "@/core/signers/types.js";
import type { SafeSigner } from "./types.js";
import { safeWebAuthnSigner } from "./webauthn/webAuthn.js";
import type { webAuthnOptions } from "@/core/signers/passkeys/types.js";

type SafeSignerParams = {
    accountSigner: Signer;
    userOpVerifyingContract: Address;
    smartAccountAddress: Address;
    fullDomainSelected: boolean;
    rpId?: string;
    tauriOptions?: webAuthnOptions["tauriOptions"];
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
        accountSigner,
        userOpVerifyingContract,
        smartAccountAddress,
        fullDomainSelected,
        rpId,
        tauriOptions
    }: SafeSignerParams
): Promise<SafeSigner> {
    if (isComethSigner(accountSigner) && accountSigner.type === "passkey") {
        return {
            ...(await safeWebAuthnSigner(client, {
                passkey: accountSigner.passkey,
                passkeySignerAddress: accountSigner.passkey.signerAddress,
                userOpVerifyingContract,
                smartAccountAddress,
                fullDomainSelected,
                rpId,
                tauriOptions
            })),
        };
    }

    return {
        ...(await safeECDSASigner(client, {
            signer: getSigner(accountSigner),
            smartAccountAddress,
            userOpVerifyingContract,
        })),
    };
}
