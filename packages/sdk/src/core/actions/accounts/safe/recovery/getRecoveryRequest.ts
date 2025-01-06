import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { getProjectParamsByChain } from "@/core/services/comethService";
import delayModuleService, {
    type RecoveryParamsResponse,
} from "@/core/services/delayModuleService";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Prettify,
    type PublicClient,
    type Transport,
    createPublicClient,
} from "viem";

export type GetRecoveryRequestParams = {
    effectiveDelayAddress?: Address;
    publicClient?: PublicClient;
};

export async function getRecoveryRequest<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<GetRecoveryRequestParams> = {}
): Promise<RecoveryParamsResponse | undefined> {
    const { effectiveDelayAddress, publicClient } = args;

    const smartAccounAddress = client.account?.address as Address;

    const rpcClient =
        publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as PublicClient);

    let delayAddress: Address;

    if (effectiveDelayAddress) {
        delayAddress = effectiveDelayAddress;
    } else {
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
        client: rpcClient,
    });

    if (!isDelayModuleDeployed) throw new Error("Recovery has not been setup");

    const isRecoveryQueueEmpty = await delayModuleService.isQueueEmpty(
        delayAddress,
        rpcClient
    );

    if (isRecoveryQueueEmpty) return undefined;

    return await delayModuleService.getCurrentRecoveryParams(
        delayAddress,
        rpcClient
    );
}
