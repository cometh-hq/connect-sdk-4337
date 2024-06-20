import { type SmartAccountActions, smartAccountActions } from "permissionless";
import type { Middleware } from "permissionless/actions/smartAccount";
import type { EntryPoint } from "permissionless/types";
import type { Chain, Client, Hash, Transport } from "viem";

import {
    type ValidateAddDevice,
    validateAddDevice,
} from "@/core/actions/accounts/safe/addDeviceActions.js";
import type { SmartAccount } from "permissionless/accounts/types.js";

export type ComethClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined,
> = SmartAccountActions<entryPoint, TChain, TAccount> & {
    validateAddDevice: <TTransport extends Transport>(
        args: Parameters<
            typeof validateAddDevice<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Hash>;
};

export function comethAccountClientActions<entryPoint extends EntryPoint>({
    middleware,
}: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TAccount extends SmartAccount<entryPoint> | undefined =
            | SmartAccount<entryPoint>
            | undefined,
    >(
        client: Client<TTransport, TChain, TAccount>
    ): ComethClientActions<entryPoint, TChain, TAccount> => ({
        ...smartAccountActions({ middleware })(client),
        validateAddDevice: (args) =>
            validateAddDevice<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                    middleware,
                } as ValidateAddDevice
            ),
    });
}
