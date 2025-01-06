import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { getProjectParamsByChain } from "@/core/services/comethService";
import delayModuleService from "@/core/services/delayModuleService";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Prettify,
    type Transport,
    createPublicClient,
    type PublicClient,
} from "viem";

export type IsRecoveryActiveParams = {
    effectiveDelayAddress?: Address;
    publicClient?: PublicClient;
};

export type IsRecoveryActiveReturnType = {
    isDelayModuleDeployed: boolean;
    guardianAddress: Address | null;
};

export async function isRecoveryActive<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<IsRecoveryActiveParams> = {}
): Promise<IsRecoveryActiveReturnType> {
    const { effectiveDelayAddress, publicClient } = args;

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

    let contractGuardian = null;

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: rpcClient,
    });

    if (isDelayModuleDeployed) {
        contractGuardian = await delayModuleService.getGuardianAddress({
            delayAddress,
            chain: client.chain as Chain,
            rpcUrl: rpcClient.transport.url,
        });
    }

    return { isDelayModuleDeployed, guardianAddress: contractGuardian };
}