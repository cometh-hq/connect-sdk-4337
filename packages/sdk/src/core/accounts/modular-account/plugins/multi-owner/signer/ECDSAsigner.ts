import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";
import {
    type Address,
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type LocalAccount,
    type SignableMessage,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    hashMessage,
    hashTypedData,
} from "viem";
import { signMessage } from "viem/actions";
import { MultiOwnerPlugin, MultiOwnerPluginAbi } from "../plugin.js";

export const ECDSAMessageSigner = <
    TTransport extends Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    smartAccountAddress: Address,
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    signer: () => any,
    pluginAddress: Address = MultiOwnerPlugin.meta.addresses[client.chain!.id]
) => {
    const viemSigner: LocalAccount = {
        ...signer(),
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
    } as LocalAccount;

    const signWith712Wrapper = async (msg: Hash): Promise<`0x${string}`> => {
        const [, name, version, chainId, verifyingContract, salt] = await (
            client as any
        ).readContract({
            abi: MultiOwnerPluginAbi,
            address: pluginAddress,
            functionName: "eip712Domain",
            account: smartAccountAddress,
        });

        return signer().signTypedData({
            domain: {
                chainId: Number(chainId),
                name,
                salt,
                verifyingContract,
                version,
            },
            types: {
                AlchemyModularAccountMessage: [
                    { name: "message", type: "bytes" },
                ],
            },
            message: {
                message: msg,
            },
            primaryType: "AlchemyModularAccountMessage",
        });
    };

    return {
        getDummySignature: (): `0x${string}` => {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
        },
        signUserOperationHash: async (
            uoHash: `0x${string}`
        ): Promise<`0x${string}`> => {
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: uoHash },
            });
            return signature;
        },

        signMessage({
            message,
        }: {
            message: SignableMessage;
        }): Promise<`0x${string}`> {
            return signWith712Wrapper(hashMessage(message));
        },

        signTypedData: <
            const typedData extends TypedData | Record<string, unknown>,
            primaryType extends
                | keyof typedData
                | "EIP712Domain" = keyof typedData,
        >(
            typedDataDefinition: TypedDataDefinition<typedData, primaryType>
        ): Promise<Hex> => {
            return signWith712Wrapper(hashTypedData(typedDataDefinition));
        },
    };
};
