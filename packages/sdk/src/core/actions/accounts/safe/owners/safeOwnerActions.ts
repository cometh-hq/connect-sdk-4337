import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { SAFE_SENTINEL_OWNERS } from "@/core/accounts/safe/types";
import type { SmartAccountClient } from "@/core/clients/accounts/safe/createClient";
import type { DeviceData, WebAuthnSigner } from "@/core/types";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hash,
    type PublicClient,
    type SendTransactionParameters,
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
    isSmartContract?: boolean;
};

export type SafeOwnerPluginActions = {
    addOwner: (args: { ownerToAdd: Address }) => Promise<Hash>;
    removeOwner: (args: { ownerToRemove: Address }) => Promise<Hash>;
    getOwners: () => Promise<readonly Address[]>;
    getEnrichedOwners: () => Promise<EnrichedOwner[]>;
};

export const safeOwnerPluginActions =
    (publicClient?: PublicClient) =>
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
                publicClient ??
                createPublicClient({
                    chain: smartAccountClient.chain,
                    transport: http(),
                    cacheTime: 60_000,
                    batch: {
                        multicall: { wait: 50 },
                    },
                });

            const isDeployed = await isSmartAccountDeployed(
                rpcClient,
                smartAccountClient.account?.address as Address
            );

            if (!isDeployed)
                throw new Error("Can't remove owner on an undeployed safe");

            const owners = (await rpcClient.readContract({
                address: smartAccountClient.account?.address as Address,
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
                publicClient ??
                createPublicClient({
                    chain: smartAccountClient.chain,
                    transport: http(),
                    cacheTime: 60_000,
                    batch: {
                        multicall: { wait: 50 },
                    },
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

        async getEnrichedOwners() {
            const rpcClient =
                publicClient ??
                createPublicClient({
                    chain: smartAccountClient.chain,
                    transport: http(),
                    cacheTime: 60_000,
                    batch: {
                        multicall: { wait: 50 },
                    },
                });

            const isDeployed = await isSmartAccountDeployed(
                rpcClient,
                smartAccountClient.account?.address as Address
            );

            const api = smartAccountClient?.account?.connectApiInstance;

            const webAuthnSigners =
                (await api?.getWebAuthnSignersByWalletAddressAndChain(
                    smartAccountClient.account?.address as Address,
                    rpcClient.chain?.id as number
                )) as WebAuthnSigner[];

            if (!isDeployed)
                return [
                    {
                        address: webAuthnSigners[0].signerAddress as Address,
                        deviceData: webAuthnSigners[0].deviceData,
                        creationDate: webAuthnSigners[0].creationDate,
                    },
                ];

            const owners = (await rpcClient.readContract({
                address: smartAccountClient.account?.address as Address,
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
                        isSmartContract: true,
                    };
                }
                return { address: owner, isSmartContract: false };
            });

            const bytecodes = await Promise.all(
                enrichedOwners.map((owner) =>
                    rpcClient.getCode({
                        address: owner.address,
                    })
                )
            );

            enrichedOwners.forEach((enrichedOwner, index) => {
                if (
                    !enrichedOwner.isSmartContract &&
                    bytecodes[index] !== undefined
                ) {
                    enrichedOwner.isSmartContract = true;
                }
            });

            return enrichedOwners;
        },
    });
