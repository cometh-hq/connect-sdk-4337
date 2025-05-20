import { SafeAbi } from "@/abi/safe";
import { SafeNotDeployedError } from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import { type Address, type PublicClient, getContract } from "viem";

export const isModuleEnabled = async ({
    client,
    safeAddress,
    moduleAddress,
}: {
    client: PublicClient;
    safeAddress: Address;
    moduleAddress: Address;
}) => {
    const safe = getContract({
        address: safeAddress,
        abi: SafeAbi,
        client,
    });

    const isDeployed = await isSmartAccountDeployed(client, safeAddress);

    if (!isDeployed) throw new SafeNotDeployedError();

    return await safe.read.isModuleEnabled([moduleAddress]);
};
