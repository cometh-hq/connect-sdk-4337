import { defaultClientConfig } from "@/constants";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { SAFE_SENTINEL_OWNERS } from "@/core/accounts/safe/types";
import type { SmartAccountClient } from "@/core/clients/accounts/safe/createClient";
import {
    OwnerToRemoveIsNotSafeOwnerError,
    RemoveOwnerOnUndeployedSafeError,
} from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hash,
    type SendTransactionParameters,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    getAddress,
    pad,
} from "viem";

export type SafeOwnerPluginActions = {
    addOwner: (args: { ownerToAdd: Address }) => Promise<Hash>;
    removeOwner: (args: { ownerToRemove: Address }) => Promise<Hash>;
    getOwners: () => Promise<readonly Address[]>;
};

export const safeOwnerPluginActions =
    () =>
    <
        transport extends Transport,
        chain extends Chain | undefined = undefined,
        account extends ComethSafeSmartAccount | undefined = undefined,
        client extends Client | undefined = undefined,
    >(
        smartAccountClient: SmartAccountClient<
            transport,
            chain,
            account,
            client
        >
    ): SafeOwnerPluginActions => ({
        async addOwner(args: { ownerToAdd: Address }) {
            return await smartAccountClient.sendTransaction({
                to: smartAccountClient.account?.address as Address,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "addOwnerWithThreshold",
                    args: [args.ownerToAdd, 1n],
                }),
            } as SendTransactionParameters);
        },

        async removeOwner(args: { ownerToRemove: Address }) {
            const rpcClient =
                smartAccountClient.account?.publicClient ??
                createPublicClient({
                    chain: smartAccountClient.chain,
                    transport: http(),
                    ...defaultClientConfig,
                });

            const isDeployed = await isSmartAccountDeployed(
                rpcClient,
                smartAccountClient.account?.address as Address
            );

            if (!isDeployed) throw new RemoveOwnerOnUndeployedSafeError();

            const owners = (await rpcClient.readContract({
                address: smartAccountClient.account?.address as Address,
                abi: SafeAbi,
                functionName: "getOwners",
            })) as Address[];

            const index = owners.findIndex(
                (ownerToFind) => ownerToFind === args.ownerToRemove
            );

            if (index === -1)
                throw new OwnerToRemoveIsNotSafeOwnerError(args.ownerToRemove);

            let prevOwner: Address;

            if (index !== 0) {
                prevOwner = getAddress(owners[index - 1]);
            } else {
                prevOwner = getAddress(pad(SAFE_SENTINEL_OWNERS, { size: 20 }));
            }

            return await smartAccountClient.sendTransaction({
                to: smartAccountClient.account?.address as Address,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "removeOwner",
                    args: [prevOwner, args.ownerToRemove, 1],
                }),
            } as SendTransactionParameters);
        },

        async getOwners() {
            const rpcClient =
                smartAccountClient.account?.publicClient ??
                createPublicClient({
                    chain: smartAccountClient.chain,
                    transport: http(),
                    ...defaultClientConfig,
                });

            const isDeployed = await isSmartAccountDeployed(
                rpcClient,
                smartAccountClient.account?.address as Address
            );

            if (!isDeployed)
                return [smartAccountClient.account?.signerAddress] as Address[];

            return (await rpcClient.readContract({
                address: smartAccountClient.account?.address as Address,
                abi: SafeAbi,
                functionName: "getOwners",
            })) as Address[];
        },
    });
