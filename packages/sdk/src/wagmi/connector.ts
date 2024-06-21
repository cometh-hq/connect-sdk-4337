import {
    type SafeSmartAccount,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
} from "@/core/accounts/safe/createSafeSmartAccount";
import { getNetwork } from "@/core/accounts/utils";
import { createSmartAccountClient } from "@/core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "@/core/clients/paymaster/createPaymasterClient";
import { API } from "@/core/services/API";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint";
import { http, type Chain, type Transport } from "viem";
import { createConnector } from "wagmi";

export type ConnectWagmiConfig<entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE> =
    createSafeSmartAccountParameters<entryPoint> & {
        bundlerUrl: string;
        sponsorTransactions?: boolean;
    };

export async function smartAccountConnector<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
>({
    apiKey,
    bundlerUrl,
    rpcUrl,
    baseUrl,
    smartAccountAddress,
    entryPoint = ENTRYPOINT_ADDRESS_V07 as any,
    comethSignerConfig,
    safeContractConfig,
    sponsorTransactions = true,
}: ConnectWagmiConfig<entryPoint>) {
    const api = new API(apiKey, baseUrl);
    const chain = await getNetwork(api);

    const account = await createSafeSmartAccount({
        apiKey,
        rpcUrl,
        baseUrl,
        smartAccountAddress,
        entryPoint,
        comethSignerConfig,
        safeContractConfig,
    });

    let middleware = undefined;

    if (sponsorTransactions) {
        const paymasterClient = await createComethPaymasterClient({
            transport: http(bundlerUrl),
            chain,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        });

        middleware = {
            sponsorUserOperation: paymasterClient.sponsorUserOperation,
            gasPrice: paymasterClient.gasPrice,
        };
    }

    const smartAccountClient = createSmartAccountClient({
        account: account as unknown as SafeSmartAccount<
            ENTRYPOINT_ADDRESS_V07_TYPE,
            Transport,
            Chain | undefined
        >,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        chain,
        bundlerTransport: http(bundlerUrl),
        middleware,
    });

    return smartAccount({
        smartAccountClient: smartAccountClient as any,
    });
}

function smartAccount({
    smartAccountClient,
    id = smartAccountClient.uid,
    name = smartAccountClient.name,
    type = "smart-account",
}: {
    smartAccountClient: any & {
        estimateGas?: () => undefined | bigint;
    };
    id?: string;
    name?: string;
    type?: string;
}) {
    // Don't remove this, it is needed because wagmi has an opinion on always estimating gas:
    // https://github.com/wevm/wagmi/blob/main/packages/core/src/actions/sendTransaction.ts#L77
    smartAccountClient.estimateGas = () => {
        return undefined;
    };

    const address = smartAccountClient?.account?.address;

    if (!address) throw new Error("No address found in smart account client");

    return createConnector((config) => ({
        id,
        name,
        type,
        // async setup() {},
        async connect({ chainId } = {}) {
            if (chainId && chainId !== (await this.getChainId())) {
                throw new Error(`Invalid chainId ${chainId} requested`);
            }

            return {
                accounts: [address],
                chainId: await this.getChainId(),
            };
        },
        async disconnect() {},
        async getAccounts() {
            return [address];
        },
        getChainId() {
            return smartAccountClient.chain.id;
        },
        async getProvider() {},
        async isAuthorized() {
            return !!address;
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
            return smartAccountClient;
        },
    }));
}
