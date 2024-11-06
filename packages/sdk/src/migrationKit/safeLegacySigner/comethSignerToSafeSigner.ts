import type {
    Address,
    Chain,
    Client,
    Hex,
    PrivateKeyAccount,
    Transport,
} from "viem";

import type { WebAuthnSigner } from "../types.js";
import { safeLegacyECDSASigner } from "./ecdsa/ecdsa.js";
import type { SafeSigner } from "./types.js";
import { safeLegacyWebAuthnSigner } from "./webauthn/webAuthn.js";

type SafeSignerParams = {
    smartAccountAddress: Address;
    eoaSigner?: PrivateKeyAccount;
    passkeySigner?: WebAuthnSigner;
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
 *   @param smartAccountAddress - The address of the smart account
 *
 * @returns A Promise that resolves to a SafeSigner instance
 */
export async function comethSignerToSafeSigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    { smartAccountAddress, eoaSigner, passkeySigner }: SafeSignerParams
): Promise<SafeSigner> {
    if (passkeySigner) {
        return {
            ...(await safeLegacyWebAuthnSigner(client, {
                signerAddress: passkeySigner.signerAddress as Address,
                smartAccountAddress,
                publicKeyId: passkeySigner.publicKeyId as Hex,
            })),
        };
    }

    if (!eoaSigner) throw new Error("eoaSigner is required");

    return {
        ...(await safeLegacyECDSASigner(client, {
            signer: eoaSigner,
            smartAccountAddress,
        })),
    };
}
