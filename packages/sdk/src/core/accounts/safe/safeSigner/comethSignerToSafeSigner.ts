import type { Address, Chain, Client, Transport } from "viem";

import { getSessionKeySigner } from "@/core/actions/accounts/safe/sessionKeys/utils.js";
import type { ComethSigner } from "../../../signers/types.js";
import { safeECDSASigner } from "./ecdsa/ecdsa.js";
import { safeSessionKeySigner } from "./sessionKey/sessionKey.js";
import type { SafeSigner } from "./types.js";
import { safeWebAuthnSigner } from "./webauthn/webAuthn.js";

type SafeSignerParams = {
    comethSigner: ComethSigner;
    safe4337SessionKeysModule: Address;
    multisend: Address;
    smartAccountAddress: Address;
    rpcUrl?: string;
};

export async function comethSignerToSafeSigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        comethSigner,
        safe4337SessionKeysModule,
        multisend,
        smartAccountAddress,
        rpcUrl,
    }: SafeSignerParams
): Promise<SafeSigner> {
    const sessionKeySigner = await getSessionKeySigner({
        chain: client?.chain as Chain,
        smartAccountAddress,
        rpcUrl,
        safe4337SessionKeysModule,
    });

    if (sessionKeySigner) {
        return {
            ...(await safeSessionKeySigner(client, {
                signer: sessionKeySigner.eoaFallback.signer,
                safe4337SessionKeysModule,
                smartAccountAddress,
                multisend,
            })),
        };
    }

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
