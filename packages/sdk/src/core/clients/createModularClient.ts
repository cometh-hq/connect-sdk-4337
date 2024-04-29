import {
    type SmartAccountActions,
    type SmartAccountClient,
    type SmartAccountClientConfig,
    smartAccountActions,
} from "permissionless";
import type { BundlerRpcSchema } from "permissionless/_types/types/bundler";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { type Chain, type Client, type Transport, createClient } from "viem";
import type { Prettify } from "viem/chains";
import {
    type MultiOwnerPluginActions,
    multiOwnerPluginActions,
} from "../actions/plugin/multiOwnerPlugin";

export type ComethAccountClientActions<
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never,
> = SmartAccountActions<TEntryPoint, TChain, TSmartAccount> &
    MultiOwnerPluginActions;

type ComethSmartAccountClient<
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never,
> = Prettify<
    Client<
        TTransport,
        TChain,
        TSmartAccount,
        BundlerRpcSchema<TEntryPoint>,
        ComethAccountClientActions<TSmartAccount, TChain, TEntryPoint>
    >
>;

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
): ComethSmartAccountClient<TSmartAccount, TTransport, TChain, TEntryPoint> {
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
    }).extend(
        smartAccountActions({
            middleware: parameters.middleware,
        })
    ) as SmartAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>;

    return client.extend(multiOwnerPluginActions) as ComethSmartAccountClient<
        TSmartAccount,
        TTransport,
        TChain,
        TEntryPoint
    >;
}
