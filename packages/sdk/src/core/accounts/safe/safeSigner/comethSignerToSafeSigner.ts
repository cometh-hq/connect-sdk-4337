import type { Address, Chain, Client, Transport } from "viem";

import type { ComethSigner } from "../../../signers/types.js";
import { safeECDSASigner } from "./ecdsa/ecdsa.js";
import type { SafeSigner } from "./types.js";
import { safeWebAuthnSigner } from "./webauthn/webAuthn.js";

type SafeSignerParams = {
    comethSigner: ComethSigner;
    safe4337SessionKeysModule: Address;
    smartAccountAddress: Address;
};

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
