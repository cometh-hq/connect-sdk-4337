import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import delayModuleService from "@/core/services/delayModuleService";
import type { SendTransactionsWithPaymasterParameters } from "permissionless/_types/actions/smartAccount/sendTransactions";
import { sendTransactions, type Middleware } from "permissionless/actions/smartAccount";

import type { EntryPoint, Prettify } from "permissionless/types";

import type { webAuthnOptions } from "@/core/signers/passkeys/types";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    parseAbi,
} from "viem";
import { getAction } from "viem/utils";

export type SetUpRecoveryModuleParams<entryPoint extends EntryPoint> = {
    passKeyName?: string;
    webAuthnOptions?: webAuthnOptions;
    rpcUrl?: string;
} & Middleware<entryPoint>;

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
    args: Prettify<SetUpRecoveryModuleParams<entryPoint>>
): Promise<Hex> {
    const { rpcUrl, middleware } = args;

    const smartAccounAddress = client.account?.address as Address;

    const publicClient = createPublicClient({
        chain: client.chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const api = client?.account?.getConnectApi();

    if (!api) throw new Error("No api found");

    const projectParams = await api.getProjectParams();

    if (!projectParams) throw Error("Error fetching project params");

    const {
        moduleFactoryAddress,
        delayModuleAddress,
        recoveryCooldown,
        recoveryExpiration,
        guardianAddress,
    } = projectParams.recoveryParams;

    console.log( {moduleFactoryAddress,
        delayModuleAddress,
        recoveryCooldown,
        recoveryExpiration,
        guardianAddress})

    const delayAddress = await delayModuleService.getDelayAddress(
        smartAccounAddress,
        {
            moduleFactoryAddress: moduleFactoryAddress as Address,
            delayModuleAddress: delayModuleAddress as Address,
            recoveryCooldown: recoveryCooldown as number,
            recoveryExpiration: recoveryExpiration as number,
        }
    );

    console.log( {delayAddress})

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: publicClient,
    });

    console.log( {isDelayModuleDeployed})

    if (isDelayModuleDeployed) throw Error("Recovery already setup");

    const delayModuleInitializer = await delayModuleService.setUpDelayModule({
        safe: smartAccounAddress,
        cooldown: recoveryCooldown as number,
        expiration: recoveryExpiration as number,
    });

    console.log( {delayModuleInitializer})
    console.log({smartAccounAddress})

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

    console.log( {setUpDelayTx})

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
