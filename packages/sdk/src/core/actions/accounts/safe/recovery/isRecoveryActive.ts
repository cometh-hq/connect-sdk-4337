import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import delayModuleService from "@/core/services/delayModuleService";
import type { Middleware } from "permissionless/actions/smartAccount";

import type { EntryPoint, Prettify } from "permissionless/types";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Transport,
    createPublicClient,
} from "viem";

export type IsRecoveryActiveParams<entryPoint extends EntryPoint> = {
    rpcUrl?: string;
} & Middleware<entryPoint>;

export type IsRecoveryActiveReturnType = {
    isDelayModuleDeployed: boolean;
    guardianAddress: Address | null;
};

export async function isRecoveryActive<
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
    args: Prettify<IsRecoveryActiveParams<entryPoint>> = {}
): Promise<IsRecoveryActiveReturnType> {
    const { rpcUrl } = args;

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

    let contractGuardian = null;

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: publicClient,
    });

    if (isDelayModuleDeployed) {
        contractGuardian = await delayModuleService.getGuardianAddress({
            delayAddress,
            chain: client.chain as Chain,
            rpcUrl,
        });
    }

    return { isDelayModuleDeployed, guardianAddress: contractGuardian };
}
