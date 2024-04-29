import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";
import {
    type Address,
    type Chain,
    type Client,
    type Hash,
    type LocalAccount,
    type SignableMessage,
    type Transport,
    hashMessage,
} from "viem";
import { signMessage } from "viem/actions";
import type { MultiOwnerSigner } from "../../types.js";
import { MultiOwnerPlugin, MultiOwnerPluginAbi } from "../plugin.js";

export const ECDSAMessageSigner = <
    TTransport extends Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    smartAccountAddress: Address,
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    signer: () => any,
    pluginAddress: Address = MultiOwnerPlugin.meta.addresses[
        (client.chain as Chain).id
    ]
): MultiOwnerSigner => {
    const viemSigner: LocalAccount = {
        ...signer(),
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
    } as LocalAccount;

    const signWith712Wrapper = async (msg: Hash): Promise<`0x${string}`> => {
        const [, name, version, chainId, verifyingContract, salt] =
            await // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
            (client as any).readContract({
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
            return await signMessage(client, {
                account: viemSigner,
                message: { raw: uoHash },
            });
        },

        signMessage({
            message,
        }: {
            message: SignableMessage;
        }): Promise<`0x${string}`> {
            return signWith712Wrapper(hashMessage(message));
        },
    };
};
