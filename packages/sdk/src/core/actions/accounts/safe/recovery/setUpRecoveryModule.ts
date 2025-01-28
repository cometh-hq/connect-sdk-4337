import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import delayModuleService from "@/core/services/delayModuleService";
import type { SendTransactionsWithPaymasterParameters } from "permissionless/_types/actions/smartAccount/sendTransactions";
import {
    type Middleware,
    sendTransactions,
} from "permissionless/actions/smartAccount";

import type { EntryPoint, Prettify } from "permissionless/types";

import { getProjectParamsByChain } from "@/core/services/comethService";
import type { webAuthnOptions } from "@/core/signers/passkeys/types";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type PublicClient,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    parseAbi,
} from "viem";
import { getAction } from "viem/utils";

export type SetUpRecoveryModuleParams<entryPoint extends EntryPoint> = Partial<
    {
        passKeyName?: string;
        webAuthnOptions?: webAuthnOptions;
        publicClient?: PublicClient;
    } & Middleware<entryPoint>
>;

export async function setUpRecoveryModule<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined =
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<SetUpRecoveryModuleParams<entryPoint>> = {}
): Promise<Hex> {
    const { publicClient, middleware } = args;

    const smartAccounAddress = client.account?.address as Address;

    const rpcClient =
        publicClient ??
        createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });

    const api = client?.account?.getConnectApi();

    if (!api) throw new Error("No api found");

    const projectParams = await getProjectParamsByChain({
        api,
        chain: client.chain as Chain,
    });

    if (!projectParams) throw Error("Error fetching project params");

    const {
        moduleFactoryAddress,
        delayModuleAddress,
        recoveryCooldown,
        recoveryExpiration,
        guardianAddress,
    } = projectParams.recoveryParams;

    const delayAddress = await delayModuleService.getDelayAddress(
        smartAccounAddress,
        {
            moduleFactoryAddress: moduleFactoryAddress as Address,
            delayModuleAddress: delayModuleAddress as Address,
            recoveryCooldown: recoveryCooldown as number,
            recoveryExpiration: recoveryExpiration as number,
        }
    );

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: rpcClient,
    });

    if (isDelayModuleDeployed) throw Error("Recovery already setup");

    const delayModuleInitializer = await delayModuleService.setUpDelayModule({
        safe: smartAccounAddress,
        cooldown: recoveryCooldown as number,
        expiration: recoveryExpiration as number,
    });

    const setUpDelayTx = [
        {
            to: moduleFactoryAddress,
            value: BigInt(0),
            data: await delayModuleService.encodeDeployDelayModule({
                singletonDelayModule: delayModuleAddress as Address,
                initializer: delayModuleInitializer as Hex,
                safe: smartAccounAddress,
            }),
        },
        {
            to: smartAccounAddress,
            value: BigInt(0),
            data: encodeFunctionData({
                abi: parseAbi(["function enableModule(address module) public"]),
                functionName: "enableModule",
                args: [delayAddress],
            }),
        },
        {
            to: delayAddress,
            value: BigInt(0),
            data: encodeFunctionData({
                abi: parseAbi(["function enableModule(address module) public"]),
                functionName: "enableModule",
                args: [guardianAddress],
            }),
        },
    ];

    const hash = await getAction(
        client,
        sendTransactions<TChain, TAccount, entryPoint>,
        "sendTransactions"
    )({
        transactions: setUpDelayTx,
        middleware,
    } as unknown as SendTransactionsWithPaymasterParameters<
        entryPoint,
        TAccount
    >);

    return hash;
}
