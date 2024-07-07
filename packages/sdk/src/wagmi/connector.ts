import {
    type SafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "@/core/accounts/safe/createSafeSmartAccount";
import { getNetwork } from "@/core/accounts/utils";
import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "@/core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "@/core/clients/paymaster/createPaymasterClient";
import { API } from "@/core/services/API";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint,
} from "permissionless/types/entrypoint";
import {
    http,
    type Address,
    type Chain,
    type ProviderRpcError,
    type Transport,
    UserRejectedRequestError,
} from "viem";
import {
    type CreateConnectorFn,
    ProviderNotFoundError,
    createConnector,
} from "wagmi";

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

export function smartAccountConnector<
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, Transport, Chain>
        | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE,
>({
    apiKey,
    bundlerUrl,
    rpcUrl,
    baseUrl,
    smartAccountAddress,
    comethSignerConfig,
    safeContractConfig,
    paymasterUrl,
    shimDisconnect = true,
}: ConnectWagmiConfig<TEntryPoint>): CreateConnectorFn {
    let chain: Chain;

    let client: ComethSmartAccountClient<
        TSmartAccount,
        TTransport,
        TChain,
        TEntryPoint
    >;

    return createConnector((config) => ({
        id: "cometh",
        name: "Cometh Connect",
        type: "cometh" as const,
        async setup(): Promise<void> {
            if (smartAccountAddress) {
                this.connect();
            }
        },
        async connect({ chainId } = {}): Promise<{
            accounts: readonly Address[];
            chainId: number;
        }> {
            try {
                const api = new API(apiKey, baseUrl);
                chain = await getNetwork(api);

                if (chainId && chainId !== (await this.getChainId())) {
                    throw new Error(`Invalid chainId ${chainId} requested`);
                }

                const account = await createSafeSmartAccount({
                    apiKey,
                    rpcUrl,
                    baseUrl,
                    smartAccountAddress,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    comethSignerConfig,
                    safeContractConfig,
                });

                if (paymasterUrl) {
                    const paymasterClient = await createComethPaymasterClient({
                        transport: http(paymasterUrl),
                        chain,
                        entryPoint: ENTRYPOINT_ADDRESS_V07,
                        rpcUrl,
                    });

                    client = createSmartAccountClient({
                        account: account,
                        entryPoint: ENTRYPOINT_ADDRESS_V07,
                        chain,
                        bundlerTransport: http(bundlerUrl),
                        middleware: {
                            sponsorUserOperation:
                                paymasterClient.sponsorUserOperation,
                            gasPrice: paymasterClient.gasPrice,
                        },
                    }) as unknown as ComethSmartAccountClient<
                        TSmartAccount,
                        TTransport,
                        TChain,
                        TEntryPoint
                    >;
                } else {
                    client = createSmartAccountClient({
                        account: account,
                        entryPoint: ENTRYPOINT_ADDRESS_V07,
                        chain,
                        bundlerTransport: http(bundlerUrl),
                    }) as unknown as ComethSmartAccountClient<
                        TSmartAccount,
                        TTransport,
                        TChain,
                        TEntryPoint
                    >;
                }

                await config.storage?.removeItem(`${this.id}.disconnected`);

                return {
                    accounts: [client?.account?.address as Address],
                    chainId: await this.getChainId(),
                };
            } catch (error) {
                if (
                    /(user rejected|connection request reset)/i.test(
                        (error as ProviderRpcError)?.message
                    )
                ) {
                    throw new UserRejectedRequestError(error as Error);
                }
                throw error;
            }
        },
        async disconnect() {
            // Remove shim signalling wallet is disconnected
            if (shimDisconnect)
                config.storage?.setItem(`${this.id}.disconnected`, true);
        },
        async getAccounts() {
            return [client?.account?.address as Address];
        },
        async getChainId(): Promise<number> {
            return chain.id;
        },
        async getProvider() {
            return client;
        },
        async isAuthorized(): Promise<boolean> {
            try {
                const isDisconnected =
                    shimDisconnect &&
                    // If shim exists in storage, connector is disconnected
                    (await config.storage?.getItem(`${this.id}.disconnected`));

                if (isDisconnected) return false;

                if (!client) throw new ProviderNotFoundError();
                return true;
            } catch {
                return false;
            }
        },
        onAccountsChanged() {
            // Not relevant
        },
        onChainChanged() {
            // Not relevant because smart accounts only exist on single chain.
        },
        onDisconnect() {
            config.emitter.emit("disconnect");
        },
        async getClient({ chainId: requestedChainId }: { chainId: number }) {
            const chainId = await this.getChainId();
            if (requestedChainId !== chainId) {
                throw new Error(`Invalid chainId ${chainId} requested`);
            }
            return client as unknown as ComethSmartAccountClient<
                TSmartAccount,
                TTransport,
                TChain,
                TEntryPoint
            >;
        },
    }));
}
