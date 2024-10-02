import { type SmartAccountActions, smartAccountActions } from "permissionless";
import type { Middleware } from "permissionless/actions/smartAccount";
import type { EntryPoint } from "permissionless/types";
import type { Chain, Client, Transport } from "viem";

import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";

export type ComethClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TTransport extends Transport = Transport,
    TAccount extends
        | SafeSmartAccount<entryPoint, string, TTransport, TChain>
        | undefined =
        | SafeSmartAccount<entryPoint, string, TTransport, TChain>
        | undefined,
> = SmartAccountActions<entryPoint, TChain, TAccount>;

export function comethAccountClientActions<entryPoint extends EntryPoint>({
    middleware,
}: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
    >(
        client: Client<TTransport, TChain, any>
    ): ComethClientActions<entryPoint, TChain, TTransport, any> => ({
        ...smartAccountActions({ middleware })(client),
    });
}
