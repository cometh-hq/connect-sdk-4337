import type {
    Address,
    Chain,
    Client,
    Hex,
    PrivateKeyAccount,
    Transport,
} from "viem";

import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types.js";
import { safeLegacyECDSASigner } from "./ecdsa/ecdsa.js";
import type { SafeSigner } from "./types.js";
import { safeLegacyWebAuthnSigner } from "./webauthn/webAuthn.js";
import { EoaSignerRequiredError } from "@/errors.js";

type SafeSignerParams = {
    smartAccountAddress: Address;
    eoaSigner?: PrivateKeyAccount;
    passkey?: PasskeyLocalStorageFormat;
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
    { smartAccountAddress, eoaSigner, passkey }: SafeSignerParams
): Promise<SafeSigner> {
    if (passkey) {
        return {
            ...(await safeLegacyWebAuthnSigner(client, {
                signerAddress: passkey.signerAddress as Address,
                smartAccountAddress,
                publicKeyId: passkey.id as Hex,
            })),
        };
    }

    if (!eoaSigner) throw new EoaSignerRequiredError();

    return {
        ...(await safeLegacyECDSASigner(client, {
            signer: eoaSigner,
            smartAccountAddress,
        })),
    };
}
