import { ENTRYPOINT_ADDRESS_V06 } from "@/constants";
import type { EntryPoint } from "permissionless/types/entrypoint";
import {
    type Account,
    type Chain,
    type Client,
    type PublicClientConfig,
    type Transport,
    createClient,
    custom,
} from "viem";
import { getNetwork } from "../../accounts/utils";
import { gasPrice } from "../../actions/paymaster/gasPrice";
import {
    type SponsorUserOperationReturnType,
    sponsorUserOperation,
} from "../../actions/paymaster/sponsorUserOperation";
import { API } from "../../services/API";
import type { UserOperation } from "../../types";
import type { ComethPaymasterRpcSchema } from "../types";

export type ComethPaymasterClient = Client<
    Transport,
    Chain | undefined,
    Account | undefined,
    ComethPaymasterRpcSchema,
    ComethPaymasterClientActions
>;

export type ComethPaymasterClientActions = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: (args: {
        userOperation: UserOperation;
    }) => Promise<SponsorUserOperationReturnType>;
    gasPrice: () => Promise<{
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
    }>;
};

const comethPaymasterActions =
    <entryPoint extends EntryPoint>(entryPointAddress: entryPoint) =>
    (client: Client): ComethPaymasterClientActions => ({
        sponsorUserOperation: async (args: {
            userOperation: UserOperation;
        }) =>
            sponsorUserOperation(client as ComethPaymasterClient, {
                ...args,
                entryPoint: entryPointAddress,
            }),
        gasPrice: async () => gasPrice(client as ComethPaymasterClient),
    });

export const getPaymasterClient = async (
    apiKey: string
): Promise<ComethPaymasterClient> => {
    const api = new API(apiKey, "http://127.0.0.1:8000/connect");
    const chain = await getNetwork(api);

    return createComethPaymasterClient({
        chain,
        transport: custom({
            async request({ method, params }) {
                if (method === "pm_sponsorUserOperation") {
                    const [userOperation, validUntil, validAfter] = params;
                    return await api.validatePaymaster(
                        userOperation,
                        validUntil,
                        validAfter
                    );
                }
            },
        }),
        entryPoint: ENTRYPOINT_ADDRESS_V06,
    });
};

const createComethPaymasterClient = <
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = undefined,
>(
    parameters: PublicClientConfig<transport, chain> & {
        entryPoint: entryPoint;
    }
): ComethPaymasterClient => {
    const { key = "public", name = "Cometh Paymaster Client" } = parameters;
    const client = createClient({
        ...parameters,
        key,
        name,
        type: "comethPaymasterClient",
    });
    return client.extend(comethPaymasterActions(parameters.entryPoint));
};
