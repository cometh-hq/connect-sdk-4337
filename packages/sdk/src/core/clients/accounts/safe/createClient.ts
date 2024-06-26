import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    type SafeOwnerPluginActions,
    safeOwnerPluginActions,
} from "@/core/actions/accounts/safe/owners/safeOwnerActions";
import {
    type SafeSessionKeyActions,
    safeSessionKeyActions,
} from "@/core/actions/accounts/safe/sessionKeys/sessionKeyActions";
import type {
    SmartAccountClient,
    SmartAccountClientConfig,
} from "permissionless";
import type { BundlerRpcSchema } from "permissionless/_types/types/bundler";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { type Chain, type Client, type Transport, createClient } from "viem";
import type { Prettify } from "viem/chains";
import {
    type ComethClientActions,
    comethAccountClientActions,
} from "../../decorators/cometh";

export type ComethAccountClientActions<
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, Transport, Chain>
        | undefined,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never,
> = ComethClientActions<TEntryPoint, TChain, TSmartAccount> &
    SafeOwnerPluginActions &
    SafeSessionKeyActions;

export type ComethSmartAccountClient<
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, Transport, Chain>
        | undefined,
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
    TSmartAccount extends
        | SafeSmartAccount<TEntryPoint, Transport, Chain>
        | undefined,
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
        comethAccountClientActions({
            middleware: parameters.middleware,
        })
    ) as SmartAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>;

    const enshrinedClient = client.extend(safeSessionKeyActions);

    return enshrinedClient.extend(
        safeOwnerPluginActions
    ) as ComethSmartAccountClient<
        TSmartAccount,
        TTransport,
        TChain,
        TEntryPoint
    >;
}
