import { ENTRYPOINT_ADDRESS_V06 } from "@/constants";
import type { UserOperation } from "permissionless";
import type {
    EntryPoint,
    GetEntryPointVersion,
} from "permissionless/types/entrypoint";
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
        bundlerUrl: string
    ) =>
    (client: Client): ComethPaymasterClientActions => ({
        sponsorUserOperation: async <entryPoint extends EntryPoint>(args: {
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>;
        }) =>
            sponsorUserOperation(client as ComethPaymasterClient<entryPoint>, {
                ...args,
                entryPoint: entryPointAddress,
                bundlerUrl,
            }),
        gasPrice: async () =>
            gasPrice(client as ComethPaymasterClient<entryPoint>),
    });

export const createComethPaymasterClient = async <
    entryPoint extends EntryPoint,
>({
    apiKey,
    bundlerUrl,
    baseUrl,
}: { apiKey: string; bundlerUrl: string; baseUrl?: string }): Promise<
    ComethPaymasterClient<entryPoint>
> => {
    const api = new API(apiKey, baseUrl);
    const chain = await getNetwork(api);

    return createPaymasterClient({
        chain,
        transport: custom({
            async request({ method, params }) {
                if (method === "pm_sponsorUserOperation") {
                    const [userOperation] = params;
                    return await api.validatePaymaster(userOperation);
                }

                throw new Error(`Method ${method} not found`);
            },
        }),
        entryPoint: ENTRYPOINT_ADDRESS_V06,
        bundlerUrl,
    });
};

const createPaymasterClient = <
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = undefined,
>(
    parameters: PublicClientConfig<transport, chain> & {
        entryPoint: entryPoint;
        bundlerUrl: string;
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
        comethPaymasterActions(parameters.entryPoint, parameters.bundlerUrl)
    );
};
