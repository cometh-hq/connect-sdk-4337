import { gasPrice } from "@/core/actions/paymaster/gasPrice";
import {
    type SponsorUserOperationReturnType,
    sponsorUserOperation,
} from "@/core/actions/paymaster/sponsorUserOperation";
import type { UserOperation } from "permissionless";
import type {
    EntryPoint,
    GetEntryPointVersion,
} from "permissionless/types/entrypoint";
import {
    type Account,
    type Chain,
    type Client,
    type PublicClient,
    type PublicClientConfig,
    type Transport,
    createClient,
} from "viem";
import type { ComethPaymasterRpcSchema } from "../types";

export type ComethPaymasterClient<entryPoint extends EntryPoint> = Client<
    Transport,
    Chain | undefined,
    Account | undefined,
    ComethPaymasterRpcSchema<entryPoint>,
    ComethPaymasterClientActions
>;

export type ComethPaymasterClientActions = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: <entryPoint extends EntryPoint>(args: {
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>;
    }) => Promise<SponsorUserOperationReturnType>;
    /**
     * Returns maxFeePerGas & maxPriorityFeePerGas required to sponsor a userOperation.
     */
    gasPrice: () => Promise<{
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
    }>;
};

const comethPaymasterActions =
    <entryPoint extends EntryPoint>(
        entryPointAddress: entryPoint,
        publicClient?: PublicClient
    ) =>
    (client: Client): ComethPaymasterClientActions => ({
        sponsorUserOperation: async <entryPoint extends EntryPoint>(args: {
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>;
        }) =>
            sponsorUserOperation(client as ComethPaymasterClient<entryPoint>, {
                ...args,
                entryPoint: entryPointAddress,
            }),
        gasPrice: async () =>
            gasPrice(client as ComethPaymasterClient<entryPoint>, publicClient),
    });

export const createComethPaymasterClient = <
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = undefined,
>(
    parameters: PublicClientConfig<transport, chain> & {
        entryPoint: entryPoint;
        publicClient?: PublicClient;
    }
): ComethPaymasterClient<entryPoint> => {
    const { key = "public", name = "Cometh Paymaster Client" } = parameters;
    const client = createClient({
        ...parameters,
        key,
        name,
        type: "comethPaymasterClient",
    });
    return client.extend(
        comethPaymasterActions(parameters.entryPoint, parameters.publicClient)
    );
};
