import { defaultClientConfig } from "@/constants";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { getProjectParamsByChain } from "@/core/services/comethService";
import delayModuleService, {
    type RecoveryParamsResponse,
} from "@/core/services/delayModuleService";
import { APINotFoundError, FetchingProjectParamsError, RecoveryNotSetUpError } from "@/errors";

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
    const { effectiveDelayAddress } = args;

    const smartAccounAddress = client.account?.address as Address;

    const rpcClient =
        client.account?.publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        }) as PublicClient);

    let delayAddress: Address;

    if (effectiveDelayAddress) {
        delayAddress = effectiveDelayAddress;
    } else {
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

    if (!isDelayModuleDeployed) throw new RecoveryNotSetUpError();

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
