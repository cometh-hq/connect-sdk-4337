import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import {
    type SafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "@/core/accounts/safe/createSafeSmartAccount";
import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "@/core/clients/accounts/safe/createClient";
import { createConnector } from "@wagmi/core";
import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint,
} from "permissionless/types";
import {
    http,
    type Chain,
    type Transport,
    UserRejectedRequestError,
    getAddress,
} from "viem";
import { ConnectEIP1193Provider } from "./ConnectEIP1193Provider";

export type ConnectWagmiConfig<
    TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE,
> = createSafeSmartAccountParameters<TEntryPoint> & {
    bundlerUrl: string;
    paymasterUrl?: string;
} & {
    /**
     *
     * This flag simulates the disconnect behavior by keeping track of connection status in storage
     * and only autoconnecting when previously connected by user action (e.g. explicitly choosing to connect).
     *
     * @default true
     */
    shimDisconnect?: boolean;
};

smartAccountConnector.type = "comethConnector" as const;
export function smartAccountConnector<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE,
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined =
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined,
>({
    apiKey,
    bundlerUrl,
    rpcUrl,
    baseUrl,
    smartAccountAddress,
    comethSignerConfig,
    safeContractConfig,
    signer,
}: ConnectWagmiConfig<TEntryPoint>) {
    type Provider = ConnectEIP1193Provider<EntryPoint> | undefined;
    let walletProvider: Provider | undefined;

    let chain: Chain;

    return createConnector<Provider>((config) => ({
        id: "connectSDK",
        name: "comethConnect",
        supportsSimulation: true,
        type: smartAccountConnector.type,

        async connect({ chainId } = {}) {
            console.log("connect starts");
            try {
           

                if (chainId && chainId !== (await this.getChainId())) {
                    throw new Error(`Invalid chainId ${chainId} requested`);
                }

                const account = await createSafeSmartAccount({
                    apiKey,
                    chain,
                    rpcUrl,
                    baseUrl,
                    smartAccountAddress,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    comethSignerConfig,
                    safeContractConfig,
                    signer,
                });

                console.log(account);

                const client = createSmartAccountClient({
                    account: account,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    chain,
                    bundlerTransport: http(bundlerUrl),
                    rpcUrl,
                }) as unknown as ComethSmartAccountClient<
                    TTransport,
                    TChain,
                    TEntryPoint,
                    TSmartAccount
                >;

                console.log(account);

                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                walletProvider = new ConnectEIP1193Provider(client as any);
                console.log({ walletProvider });

                console.log(client.account.address);
                console.log(chain.id);

                return {
                    accounts: [client.account.address],
                    chainId: chain.id,
                };
            } catch (error) {
                console.log({ error });
                if (
                    /(user closed modal|accounts received is empty|user denied account)/i.test(
                        (error as Error).message
                    )
                )
                    throw new UserRejectedRequestError(error as Error);
                throw error;
            }
        },

        async disconnect() {
            walletProvider = undefined;
        },

        async getAccounts() {
            const provider = await this.getProvider();
            if (!provider) return [];

            return (
                (await provider.request({
                    method: "eth_accounts",
                })) as string[]
            ).map((x) => getAddress(x));
        },

        async getChainId() {
            const provider = await this.getProvider();
            if (!provider) return chain.id;

            const chainId = await provider.request({ method: "eth_chainId" });
            return Number(chainId as number);
        },

        async getProvider() {
            return walletProvider;
        },

        async isAuthorized() {
            try {
                const accounts = await this.getAccounts();
                return !!accounts.length;
            } catch {
                return false;
            }
        },

        async switchChain() {
            throw new Error("Switching chain is not supported");
        },

        onAccountsChanged(accounts) {
            if (accounts.length === 0) this.onDisconnect();
            else
                config.emitter.emit("change", {
                    accounts: accounts.map((x) => getAddress(x)),
                });
        },

        onChainChanged(chain) {
            const chainId = Number(chain);
            config.emitter.emit("change", { chainId });
        },

        async onDisconnect(_error) {
            config.emitter.emit("disconnect");
            walletProvider = undefined;
        },
    }));
}
