import { defaultClientConfig } from "@/constants";
import {
    APINotFoundError,
    FetchingProjectParamsError,
    RecoveryNotSetUpError,
} from "@/errors";
import { getProjectParamsByChain } from "@/services/comethService";
import delayModuleService, {
    type RecoveryParamsResponse,
} from "@/services/delayModuleService";

import { API } from "@/services/API";
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
import type { SmartAccount } from "viem/_types/account-abstraction";

export type GetRecoveryRequestParams = {
    apiKey: string;
    baseUrl?: string;
    effectiveDelayAddress?: Address;
};

export async function getRecoveryRequest<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<GetRecoveryRequestParams>
): Promise<RecoveryParamsResponse | undefined> {
    const { effectiveDelayAddress } = args;

    const smartAccounAddress = client.account?.address as Address;

    const rpcClient =
        (client.account?.client as PublicClient) ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        }) as PublicClient);

    let delayAddress: Address;

    if (effectiveDelayAddress) {
        delayAddress = effectiveDelayAddress;
    } else {
        const api = new API(args.apiKey, args.baseUrl);

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
