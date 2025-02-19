import { createWalletClient, custom } from "viem";

import type {
    Account,
    Chain,
    EIP1193Provider,
    Hex,
    SignableMessage,
    Transport,
    TypedData,
    TypedDataDefinition,
    WalletClient,
} from "viem";

import { signTypedData } from "viem/actions";

export function walletClientToSmartAccountSigner<
    TChain extends Chain | undefined = Chain | undefined,
>(walletClient: WalletClient<Transport, TChain, Account>) {
    return {
        address: walletClient.account.address,
        type: "local",
        source: "custom",
        publicKey: walletClient.account.address,
        signMessage: async ({
            message,
        }: { message: SignableMessage }): Promise<Hex> => {
            return walletClient.signMessage({ message });
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData,
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return signTypedData<TTypedData, TPrimaryType, TChain, Account>(
                walletClient,
                {
                    account: walletClient.account,
                    ...typedData,
                }
            );
        },
    };
}

export const providerToSmartAccountSigner = async (
    provider: EIP1193Provider,
    params?: {
        signerAddress: Hex;
    }
) => {
    let account: Hex;
    if (!params) {
        try {
            [account] = await provider.request({
                method: "eth_requestAccounts",
            });
        } catch {
            [account] = await provider.request({
                method: "eth_accounts",
            });
        }
    } else {
        account = params.signerAddress;
    }
    const walletClient = createWalletClient({
        account: account as Hex,
        transport: custom(provider),
    });
    return walletClientToSmartAccountSigner(walletClient);
};
