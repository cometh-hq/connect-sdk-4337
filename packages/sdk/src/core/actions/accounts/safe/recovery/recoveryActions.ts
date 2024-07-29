import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { SAFE_SENTINEL_OWNERS } from "@/core/accounts/safe/types";
import delayModuleService from "@/core/services/delayModuleService";
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
        async initRecoveryRequest() {

            const API = client.account?.getConnectApi()

            const {moduleFactoryAddress, singletonDelayModuleAddress, cooldown, expiration} = await API.getProjectParams();

            const delayAddress = await delayModuleService.getDelayAddress(
                client.account?.address as Address,
                {
                  moduleFactoryAddress,
                  delayModuleAddress: singletonDelayModuleAddress,
                  recoveryCooldown: cooldown,
                  recoveryExpiration: expiration
                }
              )

              const isDeployed = await isSmartAccountDeployed(
                publicClient,
                client.account?.address as Address
            );



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

      
    });
