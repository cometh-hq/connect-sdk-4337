import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";

import type { EntryPoint, Prettify } from "permissionless/types";

import type { Address, Chain, Client, Hex, Transport } from "viem";

export type VerifySignatureParams = {
    message: string;
    signature: Hex;
};

export async function verifySignature<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined =
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<VerifySignatureParams>
): Promise<boolean> {
    const { message, signature } = args;

    const api = client?.account?.getConnectApi();
    const smartAccountAddress = client.account?.address as Address;

    if (!api) throw new Error("No api found");

    const isValidSignature = await api.isValidSignature(
        smartAccountAddress,
        message,
        signature
    );

    return isValidSignature;
}
