import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { SAFE_SENTINEL_OWNERS } from "@/core/accounts/safe/types";
import type { DeviceData, WebAuthnSigner } from "@/core/types";
import {
    type SmartAccountClient,
    isSmartAccountDeployed,
} from "permissionless";
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
    pad,
} from "viem";

export type EnrichedOwner = {
    address: Address;
    deviceData?: DeviceData;
    creationDate?: Date;
};

export type SafeOwnerPluginActions = {
    addOwner: (args: { ownerToAdd: Address }) => Promise<Hash>;
    removeOwner: (args: { ownerToRemove: Address }) => Promise<Hash>;
    getOwners: () => Promise<readonly Address[]>;
    getEnrichedOwners: () => Promise<EnrichedOwner[]>;
};

export const safeOwnerPluginActions =
    (rpcUrl?: string) =>
    <
        TSmartAccount extends SafeSmartAccount<TEntryPoint> | undefined,
        TTransport extends Transport = Transport,
        TChain extends Chain | undefined = undefined,
        TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<
            infer U
        >
            ? U
            : never,
    >(
        client: SmartAccountClient<
            TEntryPoint,
            TTransport,
            TChain,
            TSmartAccount
        >
    ): SafeOwnerPluginActions => ({
        async addOwner(args: { ownerToAdd: Address }) {
            return await client.sendTransaction({
                to: client.account?.address as Address,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "addOwnerWithThreshold",
                    args: [args.ownerToAdd, 1],
                }),
                maxFeePerBlobGas: 0n,
                blobs: [],
            });
        },

        async removeOwner(args: { ownerToRemove: Address }) {
            const publicClient = createPublicClient({
                chain: client.chain,
                transport: http(rpcUrl),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            });

            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                client.account?.address as Address
            );

            if (!isDeployed)
                throw new Error("Can't remove owner on an undeployed safe");

            const owners = (await publicClient.readContract({
                address: client.account?.address as Address,
                abi: SafeAbi,
                functionName: "getOwners",
            })) as Address[];

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
                to: client.account?.address as Address,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "removeOwner",
                    args: [prevOwner, args.ownerToRemove, 1],
                }),
                maxFeePerBlobGas: 0n,
                blobs: [],
            });
        },

        async getOwners() {
            const publicClient = createPublicClient({
                chain: client.chain,
                transport: http(rpcUrl),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            });

            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                client.account?.address as Address
            );

            if (!isDeployed)
                return [client.account?.signerAddress] as Address[];

            return (await publicClient.readContract({
                address: client.account?.address as Address,
                abi: SafeAbi,
                functionName: "getOwners",
            })) as Address[];
        },

        async getEnrichedOwners() {
            const publicClient = createPublicClient({
                chain: client.chain,
                transport: http(rpcUrl),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            });

            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                client.account?.address as Address
            );

            const api = client?.account?.getConnectApi();

            const webAuthnSigners =
                (await api?.getWebAuthnSignersByWalletAddress(
                    client.account?.address as Address,
                    publicClient.chain?.id as number
                )) as WebAuthnSigner[];

            if (!isDeployed)
                return [
                    {
                        address: webAuthnSigners[0].signerAddress as Address,
                        deviceData: webAuthnSigners[0].deviceData,
                        creationDate: webAuthnSigners[0].creationDate,
                    },
                ];

            const owners = (await publicClient.readContract({
                address: client.account?.address as Address,
                abi: SafeAbi,
                functionName: "getOwners",
            })) as Address[];

            const enrichedOwners: EnrichedOwner[] = owners.map((owner) => {
                const webauthSigner = webAuthnSigners.find(
                    (webauthnSigner) => webauthnSigner.signerAddress === owner
                );

                if (webauthSigner) {
                    return {
                        address: owner,
                        deviceData: webauthSigner.deviceData,
                        creationDate: webauthSigner.creationDate,
                    };
                }
                return { address: owner };
            });

            return enrichedOwners;
        },
    });
