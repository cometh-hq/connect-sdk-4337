import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import delayModuleService from "@/core/services/delayModuleService";

import { getProjectParamsByChain } from "@/core/services/comethService";
import type { webAuthnOptions } from "@/core/signers/passkeys/types";
import { sendTransaction } from "permissionless/actions/smartAccount";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Prettify,
    type SendTransactionParameters,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    parseAbi,
    type PublicClient,
} from "viem";
import { getAction } from "viem/utils";

export type SetUpRecoveryModuleParams = {
    passKeyName?: string;
    webAuthnOptions?: webAuthnOptions;
    publicClient?: PublicClient;
};

export async function setUpRecoveryModule<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<SetUpRecoveryModuleParams>
): Promise<Hex> {
    const { publicClient } = args;

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

    const api = client?.account?.connectApiInstance;

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
        sendTransaction,
        "sendTransaction"
    )({
        calls: setUpDelayTx,
    } as unknown as SendTransactionParameters);

    return hash;
}