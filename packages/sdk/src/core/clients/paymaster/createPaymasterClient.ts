import { getUserOperationGasPrice } from "@/core/actions/paymaster/getUserOperationGasPrice";
import {
    type SponsorUserOperationReturnType,
    sponsorUserOperation,
} from "@/core/actions/paymaster/sponsorUserOperation";
import {
    type Account,
    type Chain,
    type Client,
    type PublicClient,
    type PublicClientConfig,
    type Transport,
    createClient,
} from "viem";
import {
    type PaymasterActions,
    type UserOperation,
    paymasterActions,
} from "viem/account-abstraction";
import type { ComethPaymasterRpcSchema } from "../types";

export type ComethPaymasterClient = Client<
    Transport,
    Chain | undefined,
    Account | undefined,
    ComethPaymasterRpcSchema,
    ComethPaymasterClientActions & PaymasterActions
>;

export type ComethPaymasterClientActions = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: (args: {
        userOperation: UserOperation<"0.7">;
    }) => Promise<SponsorUserOperationReturnType>;
    /**
     * Returns maxFeePerGas & maxPriorityFeePerGas required to sponsor a userOperation.
     */
    getUserOperationGasPrice: () => Promise<{
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
    }>;
};

const comethPaymasterActions =
    (publicClient?: PublicClient) =>
        (client: Client): ComethPaymasterClientActions => ({
            sponsorUserOperation: async (args: {
                userOperation: UserOperation<"0.7">;
            }) =>
                sponsorUserOperation(client as ComethPaymasterClient, {
                    ...args,
                }),
            getUserOperationGasPrice: async () =>
                getUserOperationGasPrice(client as ComethPaymasterClient, publicClient),
        });

export const createComethPaymasterClient = <
    transport extends Transport = Transport,
    chain extends Chain | undefined = undefined,
>(
    parameters: PublicClientConfig<transport, chain> & {
        publicClient?: PublicClient;
    }
): ComethPaymasterClient => {
    const { key = "public", name = "Cometh Paymaster Client" } = parameters;
    return createClient({
        ...parameters,
        key,
        name,
        type: "comethPaymasterClient",
    })
        .extend(paymasterActions)
        .extend(comethPaymasterActions(parameters.publicClient));
};