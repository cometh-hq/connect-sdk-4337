import type { Address, Chain, Client, Transport } from "viem";

import { getSigner, isComethSigner } from "@/core/signers/createSigner.js";
import type { Signer } from "@/core/signers/types.js";
import { safeECDSASigner } from "./ecdsa/ecdsa.js";
import type { SafeSigner } from "./types.js";
import { safeWebAuthnSigner } from "./webauthn/webAuthn.js";

type SafeSignerParams = {
    accountSigner: Signer;
    safe4337ModuleAddress: Address;
    smartAccountAddress: Address;
    erc7579LaunchpadAddress: Address;
    fullDomainSelected: boolean;
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
export async function toSafeSigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        accountSigner,
        safe4337ModuleAddress,
        smartAccountAddress,
        erc7579LaunchpadAddress,
        fullDomainSelected,
    }: SafeSignerParams
): Promise<SafeSigner> {
    if (isComethSigner(accountSigner) && accountSigner.type === "passkey") {
        return {
            ...(await safeWebAuthnSigner(client, {
                passkey: accountSigner.passkey,
                passkeySignerAddress: accountSigner.passkey.signerAddress,
                safe4337ModuleAddress,
                smartAccountAddress,
                erc7579LaunchpadAddress,
                fullDomainSelected,
            })),
        };
    }

    return {
        ...(await safeECDSASigner(client, {
            signer: getSigner(accountSigner),
            safe4337ModuleAddress,
            smartAccountAddress,
        })),
    };
}
