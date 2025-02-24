import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type { SmartAccountClient } from "@/core/clients/accounts/safe/createClient";
import {
    type Chain,
    type Client,
    type Transport,
    type EIP1193RequestFn,
    type EIP1474Methods,
    type RpcSchema,
} from "viem";

import { EIP1193Provider } from "@/core/clients/accounts/safe/1193Provider";

export type Eip1193Actions = {
    request: (args: { method: string; params?: any }) => Promise<
        EIP1193RequestFn<RpcSchema extends undefined ? EIP1474Methods : RpcSchema>
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
        Object.defineProperty(smartAccountClient, 'request', {
            value: async (args: { method: string; params?: any }) => {

                const provider = new EIP1193Provider(smartAccountClient as any);
                try {
                    const result = await provider.request({
                        method: args.method,
                        params: args.params,
                    });
                    return result;
                } catch (error) {
                    console.error("Error in request:", error);
                    throw error;
                }
            },
            writable: true,
            configurable: true,
        });
        return {
            request: async (args: { method: string; params?: any }) => {
                return await smartAccountClient.request(args as any);
            },
        };
    };
