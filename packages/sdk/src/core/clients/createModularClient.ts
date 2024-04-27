import {
    type SmartAccountClient,
    type SmartAccountClientConfig,
    smartAccountActions,
} from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { type Chain, type Transport, createClient } from "viem";

export function createSmartAccountClient<
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never,
>(
    parameters: SmartAccountClientConfig<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
): SmartAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount> {
    const {
        key = "Account",
        name = "Cometh Smart Account Client",
        bundlerTransport,
    } = parameters;
    const client = createClient({
        ...parameters,
        key,
        name,
        transport: bundlerTransport,
        type: "smartAccountClient",
    });

    return client.extend(
        smartAccountActions({
            middleware: parameters.middleware,
        })
    ) as SmartAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>;
}
