import {
    type Address,
    type Chain,
    type Client,
    type LocalAccount,
    type PrivateKeyAccount,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    hexToBigInt,
    toHex,
    zeroAddress,
} from "viem";
import { toAccount } from "viem/accounts";
import { signTypedData } from "viem/actions";

import { EIP712_SAFE_MESSAGE_TYPE } from "@/core/accounts/safe/types";
import { EIP712_SAFE_TX_TYPES } from "@/migrationKit/types";
import type { SafeSigner } from "../types";

/**
 * Creates a SafeSigner using ECDSA for signing
 *
 * @param client - The viem Client instance
 * @param params - Object containing:
 * @param signer - The SmartAccountSigner instance
 * @param smartAccountAddress - The address of the smart account
 *
 * @returns A Promise that resolves to a SafeSigner instance with ECDSA capabilities
 */
export async function safeLegacyECDSASigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        smartAccountAddress,
    }: {
        signer: PrivateKeyAccount;
        smartAccountAddress: Address;
    }
): Promise<SafeSigner<"safeLegacyECDSASigner">> {
    // Get the private key related account
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new Error("not supported");
        },
    } as LocalAccount;

    const account = toAccount({
        address: smartAccountAddress,
        async signMessage({ message }) {
            if (typeof message === "string") message = toHex(message);

            return signTypedData(client, {
                account: viemSigner,
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: smartAccountAddress,
                },
                types: EIP712_SAFE_MESSAGE_TYPE,
                primaryType: "SafeMessage" as const,
                message: { message },
            });
        },
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        async signTransaction(tx: any) {
            return signTypedData(client, {
                account: viemSigner,
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
                    gasToken: tx.gasToken ?? zeroAddress,
                    refundReceiver: zeroAddress,
                    nonce: hexToBigInt(tx.nonce).toString(),
                },
            });
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
            | keyof TTypedData
            | "EIP712Domain" = keyof TTypedData,
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return signTypedData<TTypedData, TPrimaryType, TChain, undefined>(
                client,
                {
                    account: viemSigner,
                    ...typedData,
                }
            );
        },
    });

    return {
        ...account,
        address: smartAccountAddress,
        source: "safeLegacyECDSASigner",
    };
}
