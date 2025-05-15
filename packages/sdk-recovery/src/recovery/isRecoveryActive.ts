import { defaultClientConfig } from "@/constants";
import { getProjectParamsByChain } from "@/services/comethService";
import delayModuleService from "@/services/delayModuleService";

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

import { APINotFoundError, FetchingProjectParamsError } from "@/errors";
import { API } from "@/services/API";
import type { SmartAccount } from "viem/_types/account-abstraction";

export type IsRecoveryActiveParams = {
    apiKey: string;
    baseUrl?: string;
    effectiveDelayAddress?: Address;
};

export type IsRecoveryActiveReturnType = {
    isDelayModuleDeployed: boolean;
    guardianAddress: Address | null;
};

export async function isRecoveryActive<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<IsRecoveryActiveParams>
): Promise<IsRecoveryActiveReturnType> {
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

    let contractGuardian = null;

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: rpcClient,
    });

    if (isDelayModuleDeployed) {
        contractGuardian = await delayModuleService.getGuardianAddress({
            delayAddress,
            client: rpcClient,
        });
    }

    return { isDelayModuleDeployed, guardianAddress: contractGuardian };
}
