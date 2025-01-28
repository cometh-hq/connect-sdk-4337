import { defaultClientConfig } from "@/constants";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { getProjectParamsByChain } from "@/core/services/comethService";
import delayModuleService from "@/core/services/delayModuleService";

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

export type IsRecoveryActiveParams = {
    effectiveDelayAddress?: Address;
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
            client: rpcClient,
        });
    }

    return { isDelayModuleDeployed, guardianAddress: contractGuardian };
}
