import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import delayModuleService from "@/core/services/delayModuleService";

import { defaultClientConfig } from "@/constants";
import { getProjectParamsByChain } from "@/core/services/comethService";
import {
    APINotFoundError,
    FetchingProjectParamsError,
    RecoveryAlreadySetUpError,
} from "@/errors";
import { sendTransaction } from "permissionless/actions/smartAccount";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type SendTransactionParameters,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    parseAbi,
} from "viem";
import { getAction } from "viem/utils";

export async function setUpRecoveryModule<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(client: Client<TTransport, TChain, TAccount>): Promise<Hex> {
    const smartAccounAddress = client.account?.address as Address;

    const rpcClient =
        client.account?.publicClient ??
        createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        });

    const api = client?.account?.connectApiInstance;

    if (!api) throw new APINotFoundError();

    const projectParams = await getProjectParamsByChain({
        api,
        chain: client.chain as Chain,
    });

    if (!projectParams) throw new FetchingProjectParamsError();

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

    if (isDelayModuleDeployed) throw new RecoveryAlreadySetUpError();

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
