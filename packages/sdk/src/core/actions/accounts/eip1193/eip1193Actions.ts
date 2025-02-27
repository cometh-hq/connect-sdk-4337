import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type { SmartAccountClient } from "@/core/clients/accounts/safe/createClient";
import type {
    Chain,
    Client,
    EIP1193Parameters,
    EIP1193RequestFn,
    EIP1474Methods,
    RpcSchema,
    Transport,
} from "viem";

import { EIP1193Provider } from "@/core/clients/accounts/safe/1193Provider";

export type Eip1193Actions = {
    request: (args: { method: string; params?: EIP1193Parameters }) => Promise<
        EIP1193RequestFn<
            RpcSchema extends undefined ? EIP1474Methods : RpcSchema
        >
    >;
};

export const eip1193Actions =
    () =>
    <
        transport extends Transport,
        chain extends Chain | undefined = undefined,
        account extends ComethSafeSmartAccount | undefined = undefined,
        client extends Client | undefined = undefined,
    >(
        smartAccountClient: SmartAccountClient<
            transport,
            chain,
            account,
            client
        >
    ): Eip1193Actions => {
        // Override the 'request' method
        Object.defineProperty(smartAccountClient, "request", {
            value: async (args: {
                method: string;
                params?: EIP1193Parameters;
            }) => {
                // biome-ignore lint/suspicious/noExplicitAny: TODO
                const provider = new EIP1193Provider(smartAccountClient as any);
                const result = await provider.request({
                    method: args.method,
                    params: args.params,
                });
                return result;
            },
            writable: true,
            configurable: true,
        });
        return {
            request: async (args: {
                method: string;
                params?: EIP1193Parameters;
            }) => {
                // biome-ignore lint/suspicious/noExplicitAny: TODO
                return await smartAccountClient.request(args as any);
            },
        };
    };
