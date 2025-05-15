import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
import { eip1193Actions } from "@/core/actions/accounts/eip1193/eip1193Actions";
import { safeOwnerPluginActions } from "@/core/actions/accounts/safe/owners/safeOwnerActions";
=======
>>>>>>> bac4782 (feat/sdk-lite (#75))
=======
import { eip1193Actions } from "@/core/actions/accounts/eip1193/eip1193Actions";
import { safeOwnerPluginActions } from "@/core/actions/accounts/safe/owners/safeOwnerActions";
>>>>>>> 8f70c31 (Sdk core/new features (#77))
>>>>>>> c2b38e023241767c6d89e0658230cd9541d9046e
import type { SmartAccountClientConfig } from "permissionless";
import {
    type BundlerRpcSchema,
    type Chain,
    type Client,
    type RpcSchema,
    type Transport,
    createClient,
} from "viem";
import { type BundlerActions, bundlerActions } from "viem/account-abstraction";
import type { Prettify } from "viem/chains";
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
import { eip5792Actions } from "viem/experimental";
=======
>>>>>>> bac4782 (feat/sdk-lite (#75))
=======
import { eip5792Actions } from "viem/experimental";
>>>>>>> 8f70c31 (Sdk core/new features (#77))
>>>>>>> c2b38e023241767c6d89e0658230cd9541d9046e
import {
    type ComethClientActions,
    comethAccountClientActions,
} from "../../decorators/cometh";

export type ComethAccountClientActions<
    chain extends Chain | undefined = Chain | undefined,
    account extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
> = ComethClientActions<chain, account>;

export type SmartAccountClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
    client extends Client | undefined = Client | undefined,
    rpcSchema extends RpcSchema | undefined = undefined,
> = Prettify<
    Client<
        transport,
        chain extends Chain
            ? chain
            : // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
              client extends Client<any, infer chain>
              ? chain
              : undefined,
        account,
        rpcSchema extends RpcSchema
            ? [...BundlerRpcSchema, ...rpcSchema]
            : BundlerRpcSchema,
        BundlerActions<account> & ComethClientActions<chain, account>
    >
>;

export type ComethSmartAccountClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
    client extends Client | undefined = Client | undefined,
    rpcSchema extends RpcSchema | undefined = undefined,
> = Prettify<
    Client<
        transport,
        chain extends Chain
            ? chain
            : // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
              client extends Client<any, infer chain>
              ? chain
              : undefined,
        account,
        rpcSchema extends RpcSchema
            ? [...BundlerRpcSchema, ...rpcSchema]
            : BundlerRpcSchema,
        BundlerActions<account> & ComethAccountClientActions<chain, account>
    >
>;

export function createSmartAccountClient<
    transport extends Transport,
    chain extends Chain | undefined = undefined,
    account extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
    client extends Client | undefined = undefined,
    rpcSchema extends RpcSchema | undefined = undefined,
>(
    parameters: SmartAccountClientConfig<
        transport,
        chain,
        account,
        client,
        rpcSchema
    >
): ComethSmartAccountClient<transport, chain, account, client> {
    const {
        client: client_,
        key = "bundler",
        name = "Bundler Client",
        paymaster,
        paymasterContext,
        bundlerTransport,
        userOperation,
    } = parameters;

    const client = Object.assign(
        createClient({
            ...parameters,
            chain: parameters.chain ?? client_?.chain,
            transport: bundlerTransport,
            key,
            name,
            type: "bundlerClient",
        }),
        { client: client_, paymaster, paymasterContext, userOperation }
    )
        .extend(bundlerActions)
        .extend(
            comethAccountClientActions()
            // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        ) as any;

<<<<<<< HEAD
    return client;
=======
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 8f70c31 (Sdk core/new features (#77))
    return client
    .extend(safeOwnerPluginActions())
    .extend(eip1193Actions())
    .extend(eip5792Actions());
<<<<<<< HEAD
=======
    return client;
>>>>>>> bac4782 (feat/sdk-lite (#75))
=======
>>>>>>> 8f70c31 (Sdk core/new features (#77))
>>>>>>> c2b38e023241767c6d89e0658230cd9541d9046e
}
