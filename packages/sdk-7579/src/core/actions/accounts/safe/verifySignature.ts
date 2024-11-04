import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type { Address, Chain, Client, Hex, Prettify, Transport } from "viem";

export type VerifySignatureParams = {
    message: string;
    signature: Hex;
};

export async function verifySignature<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<TTransport, TChain, TSmartAccount>,
    args: Prettify<VerifySignatureParams>
): Promise<boolean> {
    const { message, signature } = args;

    const api = client?.account?.connectApiInstance;
    const smartAccountAddress = client.account?.address as Address;

    if (!api) throw new Error("No api found");

    const isValidSignature = await api.isValidSignature(
        smartAccountAddress,
        message,
        signature,
        client?.chain?.id as number
    );

    return isValidSignature;
}
