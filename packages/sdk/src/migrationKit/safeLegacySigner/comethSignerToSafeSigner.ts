import type {
    Address,
    Chain,
    Client,
    Hex,
    PrivateKeyAccount,
    Transport,
} from "viem";

import { safeLegacyECDSASigner } from "./ecdsa/ecdsa.js";
import type { SafeSigner } from "./types.js";
import { safeLegacyWebAuthnSigner } from "./webauthn/webAuthn.js";

type SafeSignerParams = {
    signerAddress: Address;
    smartAccountAddress: Address;
    eoaSigner?: PrivateKeyAccount;
    publicKeyId?: Hex;
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
    {
        smartAccountAddress,
        eoaSigner,
        publicKeyId,
        signerAddress,
    }: SafeSignerParams
): Promise<SafeSigner> {
    if (publicKeyId) {
        return {
            ...(await safeLegacyWebAuthnSigner(client, {
                signerAddress: signerAddress,
                smartAccountAddress,
                publicKeyId: publicKeyId,
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
