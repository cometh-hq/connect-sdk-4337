import {
    type ComethSafeSmartAccount,
    type ComethSmartAccountClient,
    createComethPaymasterClient,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
    createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import type { Chain, Hex, Transport } from "viem";
import { http } from "wagmi";

type ContextComethSmartAccountClient = ComethSmartAccountClient<
    Transport,
    Chain,
    ComethSafeSmartAccount
>;

export async function createSmartAccount(
    config: createSafeSmartAccountParameters & {
        bundlerUrl: string;
        paymasterUrl?: string;
    }
): Promise<{ client: ContextComethSmartAccountClient; address: Hex }> {
    const {
        bundlerUrl,
        paymasterUrl,
        apiKey,
        chain,
        publicClient,
        baseUrl,
        comethSignerConfig,
        safeContractConfig,
        smartAccountAddress,
    } = config;

    const account = await createSafeSmartAccount({
        apiKey,
        chain,
        publicClient,
        baseUrl,
        smartAccountAddress,
        comethSignerConfig,
        safeContractConfig,
    });

    let client: ContextComethSmartAccountClient;

    if (paymasterUrl) {
        const paymasterClient = await createComethPaymasterClient({
            transport: http(paymasterUrl),
            chain,
            publicClient,
        });

        client = createSmartAccountClient({
            account: account as ComethSafeSmartAccount,
            chain,
            bundlerTransport: http(bundlerUrl),
            paymaster: paymasterClient,
            userOperation: {
                estimateFeesPerGas: async () => {
                    return await paymasterClient.getUserOperationGasPrice();
                },
            }
        }) as ContextComethSmartAccountClient;
    } else {
        client = createSmartAccountClient({
            account: account as ComethSafeSmartAccount,
            chain,
            bundlerTransport: http(bundlerUrl)
        }) as ContextComethSmartAccountClient;
    }

    const address = client.account.address;

    return { client, address };
}
