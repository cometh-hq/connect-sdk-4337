import { getUserOperationGasPrice } from "@/core/actions/paymaster/getUserOperationGasPrice";
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
        getUserOperationGasPrice: async () =>
            getUserOperationGasPrice(
                client as ComethPaymasterClient,
                publicClient
            ),
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
