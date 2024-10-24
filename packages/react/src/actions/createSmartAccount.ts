import {
    type ComethSmartAccountClient,
    ENTRYPOINT_ADDRESS_V07,
    type SafeSmartAccount,
    createComethPaymasterClient,
    createSafeSmartAccount,
    type createSafeSmartAccountParameters,
    createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint";
import type { Chain, Hex, Transport } from "viem";
import { http } from "wagmi";

type ContextComethSmartAccountClient = ComethSmartAccountClient<
    SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
    Transport,
    Chain,
    ENTRYPOINT_ADDRESS_V07_TYPE
>;

export async function createSmartAccount(
    config: createSafeSmartAccountParameters<ENTRYPOINT_ADDRESS_V07_TYPE> & {
        bundlerUrl: string;
        paymasterUrl?: string;
    }
): Promise<{ client: ContextComethSmartAccountClient; address: Hex }> {
    const {
        bundlerUrl,
        paymasterUrl,
        apiKey,
        chain,
        rpcUrl,
        baseUrl,
        comethSignerConfig,
        safeContractConfig,
        smartAccountAddress,
    } = config;

    const account = await createSafeSmartAccount({
        apiKey,
        chain,
        rpcUrl,
        baseUrl,
        smartAccountAddress,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        comethSignerConfig,
        safeContractConfig,
    });

    let client: ContextComethSmartAccountClient;

    if (paymasterUrl) {
        const paymasterClient = await createComethPaymasterClient({
            transport: http(paymasterUrl),
            chain,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            rpcUrl,
        });

        client = createSmartAccountClient({
            account: account as SafeSmartAccount<
                ENTRYPOINT_ADDRESS_V07_TYPE,
                Transport,
                Chain
            >,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain,
            bundlerTransport: http(bundlerUrl),
            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation,
                gasPrice: paymasterClient.gasPrice,
            },
            rpcUrl,
        }) as ContextComethSmartAccountClient;
    } else {
        client = createSmartAccountClient({
            account: account as SafeSmartAccount<
                ENTRYPOINT_ADDRESS_V07_TYPE,
                Transport,
                Chain
            >,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain,
            bundlerTransport: http(bundlerUrl),
            rpcUrl,
        }) as ContextComethSmartAccountClient;
    }

    const address = client.account.address;

    return { client, address };
}
