import { packPaymasterData } from "@/core/accounts/safe/services/utils";
import type { UserOperation } from "permissionless";
import type {
    EntryPoint,
    GetEntryPointVersion,
} from "permissionless/types/entrypoint";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless/utils";
import {
    type Account,
    type Chain,
    type Client,
    type Hex,
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
                    const userOp = {
                        callData: userOperation.callData,
                        nonce: userOperation.nonce,
                        initCode: `${
                            userOperation.factory
                        }${userOperation.factoryData?.slice(
                            2
                        )}` as `0x${string}`,
                        paymasterAndData: packPaymasterData({
                            paymaster: userOperation.paymaster as Hex,
                            paymasterVerificationGasLimit:
                                userOperation.paymasterVerificationGasLimit as bigint,
                            paymasterPostOpGasLimit:
                                userOperation.paymasterPostOpGasLimit as bigint,
                            paymasterData: userOperation.paymasterData as Hex,
                        }),
                        preVerificationGas: userOperation.preVerificationGas,
                        sender: userOperation.sender,
                        verificationGasLimit:
                            userOperation.verificationGasLimit,
                        callGasLimit: userOperation.callGasLimit,
                        maxPriorityFeePerGas:
                            userOperation.maxPriorityFeePerGas,
                        maxFeePerGas: userOperation.maxFeePerGas,
                        signature: userOperation.signature,
                    };
                    return await api.validatePaymaster(userOp);
                }

                throw new Error(`Method ${method} not found`);
            },
        }),
        entryPoint: ENTRYPOINT_ADDRESS_V07,
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
