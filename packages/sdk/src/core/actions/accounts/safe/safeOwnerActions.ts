import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { SAFE_SENTINEL_OWNERS } from "@/core/accounts/safe/types";
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
    getAddress,
    getContract,
    pad,
} from "viem";

export type SafeOwnerPluginActions = {
    addOwner: (args: { ownerToAdd: Address }) => Promise<Hash>;
    removeOwner: (args: { ownerToRemove: Address }) => Promise<Hash>;
    getOwners: (args?: { rpcUrl: string }) => Promise<readonly Address[]>;
};

export const safeOwnerPluginActions: <
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never,
>(
    client: SmartAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
) => SafeOwnerPluginActions = (client: any) => ({
    async addOwner(args: { ownerToAdd: Address }) {
        return await client.sendTransaction({
            to: client.account?.address,
            data: encodeFunctionData({
                abi: SafeAbi,
                functionName: "addOwnerWithThreshold",
                args: [args.ownerToAdd, 1],
            }),
        });
    },

    async removeOwner(args: { ownerToRemove: Address; rpcUrl?: string }) {
        const publicClient = createPublicClient({
            chain: client.chain,
            transport: http(args?.rpcUrl),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });

        const safeContract = getContract({
            address: client.account?.address,
            abi: SafeAbi,
            client: publicClient,
        });

        const owners = (await safeContract.read.getOwners([])) as Address[];

        const index = owners.findIndex(
            (ownerToFind) => ownerToFind === args.ownerToRemove
        );

        if (index === -1)
            throw new Error(`${args.ownerToRemove} is not a safe owner`);

        let prevOwner: Address;

        if (index !== 0) {
            prevOwner = getAddress(owners[index - 1]);
        } else {
            prevOwner = getAddress(pad(SAFE_SENTINEL_OWNERS, { size: 20 }));
        }

        return await client.sendTransaction({
            to: client.account?.address,
            data: encodeFunctionData({
                abi: SafeAbi,
                functionName: "removeOwner",
                args: [prevOwner, args.ownerToRemove, 1],
            }),
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

        const safeContract = getContract({
            address: client.account?.address,
            abi: SafeAbi,
            client: publicClient,
        });

        return (await safeContract.read.getOwners([])) as Address[];
    },

    /*  async getEnrichedOwners(args: {
        apiKey: string;
        baseUrl?: string;
        rpcUrl?: string;
    }) {
        const publicClient = createPublicClient({
            chain: client.chain,
            transport: http(args?.rpcUrl),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });

        const safeContract = getContract({
            address: client.account?.address,
            abi: SafeAbi,
            client: publicClient,
        });

        const owners = (await safeContract.read.getOwners([])) as Address[];

        const api = new API(args.apiKey, args.baseUrl);

        const webAuthnSigners = await api.getWebAuthnSignersByWalletAddress(
            client.account.address
        );

        console.log({webAuthnSigners})

        const enrichedOwners = owners.map((owner) => {
            const webauthSigner = webAuthnSigners.find(
                (webauthnSigner) => webauthnSigner.signerAddress === owner
            );

            if (webauthSigner) {
                return {
                    address: owner,
                    deviceData: webauthSigner.deviceData,
                    creationDate: webauthSigner.creationDate,
                };
            } else {
                return { address: owner };
            }
        });

        console.log(enrichedOwners)

        return enrichedOwners;
    }, */
});
