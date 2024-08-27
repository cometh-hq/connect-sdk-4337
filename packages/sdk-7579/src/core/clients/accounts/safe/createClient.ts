import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type {
    SmartAccountClient,
    SmartAccountClientConfig,
} from "permissionless";
import type { BundlerRpcSchema } from "permissionless/_types/types/bundler";
import type { EntryPoint } from "permissionless/types/entrypoint";
import {
    type Account,
    type Chain,
    type Client,
    type Transport,
    createClient,
} from "viem";
import type { Prettify } from "viem/chains";
import {
    type ComethClientActions,
    comethAccountClientActions,
} from "../../decorators/cometh";

export type ComethAccountClientActions<
    TTransport extends Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = any,
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined =
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined,
> = ComethClientActions<TEntryPoint, TChain, TTransport, TSmartAccount>;

export type ComethSmartAccountClient<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = any,
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined =
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined,
> = Prettify<
    Client<
        TTransport,
        TChain,
        Account,
        BundlerRpcSchema<TEntryPoint>,
        ComethAccountClientActions<
            TTransport,
            TChain,
            TEntryPoint,
            TSmartAccount
        >
    >
>;

export function createSmartAccountClient<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = any,
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined =
        | SafeSmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined,
>(
    parameters: SmartAccountClientConfig<
        TEntryPoint,
        TTransport,
        TChain,
        any
    > & { rpcUrl?: string }
): ComethSmartAccountClient<TTransport, TChain, TEntryPoint, TSmartAccount> {
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
        comethAccountClientActions({
            middleware: parameters.middleware,
        }) as any
    ) as SmartAccountClient<TEntryPoint, TTransport, TChain, any>;

    return client as any;
}
