import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/_types/types";
import type { SmartAccount } from "permissionless/accounts";
import {
    http,
    type Address,
    type Chain,
    type Hash,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    getContract,
} from "viem";
import { MultiOwnerPluginAbi } from "../../accounts/modular-account/plugins/multi-owner";

const MultiOwnerPlugin = "0xcE0000007B008F50d762D155002600004cD6c647";

export type MultiOwnerPluginActions = {
    addOwners: (args: { ownersToAdd: Address[] }) => Promise<Hash>;
    removeOwners: (args: { ownersToRemove: Address[] }) => Promise<Hash>;
    getOwners: (args?: { rpcUrl: string }) => Promise<readonly Address[]>;
    isOwnerOf: (args: {
        address: Address;
        rpcUrl?: string;
    }) => Promise<boolean>;
};

export const multiOwnerPluginActions: <
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never,
>(
    client: SmartAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
) => MultiOwnerPluginActions = (client: any) => ({
    async addOwners(args: { ownersToAdd: Address[] }) {
        const data = encodeFunctionData({
            abi: MultiOwnerPluginAbi,
            functionName: "updateOwners",
            args: [args.ownersToAdd, []],
        });

        return await client.sendTransaction({
            to: client.account?.address,
            data,
        });
    },

    async removeOwners(args: { ownersToRemove: Address[] }) {
        const data = encodeFunctionData({
            abi: MultiOwnerPluginAbi,
            functionName: "updateOwners",
            args: [[], args.ownersToRemove],
        });

        return await client.sendTransaction({
            to: client.account?.address,
            data,
        });
    },

    async getOwners(args?: { rpcUrl: string }) {
        const publicClient = createPublicClient({
            chain: client.chain,
            transport: http(args?.rpcUrl),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });

        const multiOwnerPluginContract = getContract({
            address: MultiOwnerPlugin,
            abi: MultiOwnerPluginAbi,
            client: publicClient,
        });

        return await multiOwnerPluginContract.read.ownersOf([
            client.account.address,
        ]);
    },

    async isOwnerOf(args: { address: Address; rpcUrl?: string }) {
        const publicClient = createPublicClient({
            chain: client.chain,
            transport: http(args.rpcUrl),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });

        const multiOwnerPluginContract = getContract({
            address: MultiOwnerPlugin,
            abi: MultiOwnerPluginAbi,
            client: publicClient,
        });

        return await multiOwnerPluginContract.read.isOwnerOf([
            client.account.address,
            args.address,
        ]);
    },
});
