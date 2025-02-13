import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    hashTypedData,
    hexToBigInt,
    toHex,
    zeroAddress,
} from "viem";
import { toAccount } from "viem/accounts";

import { EIP712_SAFE_MESSAGE_TYPE } from "@/core/accounts/safe/types";
import {
    formatToSafeContractSignature,
    getWebAuthnSignature,
} from "@/migrationKit/signers/passkeyService";
import { parseHex } from "@/migrationKit/signers/utils";
import { EIP712_SAFE_TX_TYPES } from "@/migrationKit/types";
import type { SafeSigner } from "../types";
import { MethodNotSupportedError } from "@/errors";

/**
 * Creates a SafeSigner using ECDSA for signing
 *
 * @param client - The viem Client instance
 * @param params - Object containing:
 *   @param smartAccountAddress - The address of the smart account
 *
 * @returns A Promise that resolves to a SafeSigner instance with ECDSA capabilities
 */
export async function safeLegacyWebAuthnSigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        smartAccountAddress,
        publicKeyId,
        signerAddress,
    }: {
        smartAccountAddress: Address;
        publicKeyId: Hex;
        signerAddress: Address;
    }
): Promise<SafeSigner<"safeLegacyWebAuthnSigner">> {
    const account = toAccount({
        address: smartAccountAddress,
        async signMessage({ message }) {
            if (typeof message === "string") message = toHex(message);

            const hash = hashTypedData({
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: smartAccountAddress,
                },
                types: EIP712_SAFE_MESSAGE_TYPE,
                primaryType: "SafeMessage" as const,
                message: { message },
            });

            const publicKeyCredential: PublicKeyCredentialDescriptor[] = [
                {
                    id: parseHex(publicKeyId),
                    type: "public-key",
                },
            ];

            const { encodedSignature } = await getWebAuthnSignature(
                hash,
                publicKeyCredential
            );

            return formatToSafeContractSignature(
                signerAddress,
                encodedSignature as Hex
            ) as Hex;
        },
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        async signTransaction(tx: any) {
            const hash = hashTypedData({
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: smartAccountAddress,
                },
                types: EIP712_SAFE_TX_TYPES,
                primaryType: "SafeTx" as const,
                message: {
                    to: tx.to,
                    value: hexToBigInt(tx.value).toString(),
                    data: tx.data,
                    operation: tx.operation,
                    safeTxGas: hexToBigInt(tx.safeTxGas).toString(),
                    baseGas: hexToBigInt(tx.baseGas).toString(),
                    gasPrice: hexToBigInt(tx.gasPrice).toString(),
                    gasToken: zeroAddress,
                    refundReceiver: zeroAddress,
                    nonce: hexToBigInt(tx.nonce).toString(),
                },
            });

            const publicKeyCredential: PublicKeyCredentialDescriptor[] = [
                {
                    id: parseHex(publicKeyId),
                    type: "public-key",
                },
            ];

            const { encodedSignature } = await getWebAuthnSignature(
                hash,
                publicKeyCredential
            );

            return formatToSafeContractSignature(
                signerAddress,
                encodedSignature as Hex
            ) as Hex;
        },
        async signTypedData() {
            throw new MethodNotSupportedError();
        },
    });

    return {
        ...account,
        address: smartAccountAddress,
        source: "safeLegacyWebAuthnSigner",
    };
}
