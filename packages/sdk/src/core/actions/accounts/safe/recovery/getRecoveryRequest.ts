import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { getProjectParamsByChain } from "@/core/services/comethService";
import delayModuleService, {
    type RecoveryParamsResponse,
} from "@/core/services/delayModuleService";

import type { EntryPoint, Prettify } from "permissionless/types";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Transport,
    createPublicClient,
} from "viem";

export type GetRecoveryRequestParams = {
    effectiveDelayAddress?: Address;
    rpcUrl?: string;
};

export async function getRecoveryRequest<
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
    args: Prettify<GetRecoveryRequestParams> = {}
): Promise<RecoveryParamsResponse | undefined> {
    const { effectiveDelayAddress, rpcUrl } = args;

    const smartAccounAddress = client.account?.address as Address;

    const publicClient = createPublicClient({
        chain: client.chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    let delayAddress: Address;

    if (effectiveDelayAddress) {
        delayAddress = effectiveDelayAddress;
    } else {
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
        } = projectParams.recoveryParams;

        delayAddress = await delayModuleService.getDelayAddress(
            smartAccounAddress,
            {
                moduleFactoryAddress: moduleFactoryAddress as Address,
                delayModuleAddress: delayModuleAddress as Address,
                recoveryCooldown: recoveryCooldown as number,
                recoveryExpiration: recoveryExpiration as number,
            }
        );
    }

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: publicClient,
    });

    if (!isDelayModuleDeployed) throw new Error("Recovery has not been setup");

    const isRecoveryQueueEmpty = await delayModuleService.isQueueEmpty(
        delayAddress,
        client.chain as Chain,
        rpcUrl
    );

    if (isRecoveryQueueEmpty) return undefined;

    return await delayModuleService.getCurrentRecoveryParams(
        delayAddress,
        client.chain as Chain,
        rpcUrl
    );
}
