import { safe4337SessionKeyModuleAbi } from "@/core/accounts/safe/abi/safe4337SessionKeyModuleAbi";
import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { createFallbackEoaSigner } from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import {
    deleteSessionKeyInStorage,
    encryptSessionKeyInStorage,
    getSessionKeySignerFromLocalStorage,
} from "@/core/signers/ecdsa/sessionKeyEoa/sessionKeyEoaService";
import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/_types/types";
import {
    type Address,
    type Chain,
    type Hash,
    type Transport,
    encodeFunctionData,
} from "viem";
import {
    type AddSessionKeyParams,
    type Session,
    queryIsWhitelistFrom4337ModuleAddress,
    querySessionFrom4337ModuleAddress,
} from "./utils";

const defaultValidAfter = new Date();
const defaultValidUntil = new Date(
    defaultValidAfter.getTime() + 1000 * 60 * 60 * 1
);

export type SafeSessionKeyActions = {
    addSessionKey: (args: AddSessionKeyParams) => Promise<Hash>;
    revokeSessionKey: (args: { sessionKey: Address }) => Promise<Hash>;
    getSessionFromAddress: (args: {
        sessionKey: Address;
    }) => Promise<Session>;
    getCurrentSessionSignerAddress: (args: {
        smartAccountAddress: Address;
    }) => Promise<Address | null>;
    addWhitelistDestination: (args: {
        sessionKey: Address;
        destination: Address;
    }) => Promise<Hash>;
    removeWhitelistDestination: (args: {
        sessionKey: Address;
        destination: Address;
    }) => Promise<Hash>;
    isAddressWhitelistDestination: (args: {
        sessionKey: Address;
        targetAddress: Address;
    }) => Promise<boolean>;
};

export const safeSessionKeyActions =
    (rpcUrl?: string) =>
    <
        TEntryPoint extends EntryPoint,
        TTransport extends Transport = Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TAccount extends SafeSmartAccount<TEntryPoint> | undefined =
            | SafeSmartAccount<TEntryPoint>
            | undefined,
    >(
        client: SmartAccountClient<TEntryPoint, TTransport, TChain, TAccount>
    ): SafeSessionKeyActions => ({
        async addSessionKey({
            validAfter = defaultValidAfter,
            validUntil = defaultValidUntil,
            destinations,
        }: AddSessionKeyParams) {
            if (destinations.length === 0)
                throw new Error("destinations cannot be empty");

            if (!!client.account?.sessionKeysEnabled)
                throw new Error("Session Keys are not enabled");

            const fallbackEoaSigner = await createFallbackEoaSigner();

            await encryptSessionKeyInStorage(
                client.account?.address as Address,
                fallbackEoaSigner.privateKey
            );

            return await client.sendTransaction({
                to: client.account?.address as Address,
                data: encodeFunctionData({
                    abi: safe4337SessionKeyModuleAbi,
                    functionName: "addSessionKey",
                    args: [
                        fallbackEoaSigner.signer.address,
                        validAfter,
                        validUntil,
                        destinations,
                    ],
                }),
                maxFeePerBlobGas: 0n,
                blobs: [],
            });
        },

        async revokeSessionKey(args: { sessionKey: Address }) {
            if (!!client.account?.sessionKeysEnabled)
                throw new Error("Session Keys are not enabled");

            const txHash = await client.sendTransaction({
                to: client.account?.address as Address,
                data: encodeFunctionData({
                    abi: safe4337SessionKeyModuleAbi,
                    functionName: "revokeSessionKey",
                    args: [args.sessionKey],
                }),
                maxFeePerBlobGas: 0n,
                blobs: [],
            });

            deleteSessionKeyInStorage(client.account?.address as Address);

            return txHash;
        },

        async getSessionFromAddress(args: {
            sessionKey: Address;
        }) {
            return await querySessionFrom4337ModuleAddress({
                chain: client.chain as Chain,
                smartAccountAddress: client.account?.address as Address,
                safe4337SessionKeysModule: client?.account
                    ?.safe4337SessionKeysModule as Address,
                sessionKey: args.sessionKey,
                rpcUrl,
            });
        },

        async getCurrentSessionSignerAddress(args: {
            smartAccountAddress: Address;
        }) {
            return getSessionKeySignerFromLocalStorage(
                args.smartAccountAddress
            );
        },

        async addWhitelistDestination(args: {
            sessionKey: Address;
            destination: Address;
        }) {
            if (!!client.account?.sessionKeysEnabled)
                throw new Error("Session Keys are not enabled");

            return await client.sendTransaction({
                to: client.account?.address as Address,
                data: encodeFunctionData({
                    abi: safe4337SessionKeyModuleAbi,
                    functionName: "addWhitelistDestination",
                    args: [args.sessionKey, args.destination],
                }),
                maxFeePerBlobGas: 0n,
                blobs: [],
            });
        },

        async removeWhitelistDestination(args: {
            sessionKey: Address;
            destination: Address;
        }) {
            return await client.sendTransaction({
                to: client.account?.address as Address,
                data: encodeFunctionData({
                    abi: safe4337SessionKeyModuleAbi,
                    functionName: "removeWhitelistDestination",
                    args: [args.sessionKey, args.destination],
                }),
                maxFeePerBlobGas: 0n,
                blobs: [],
            });
        },

        async isAddressWhitelistDestination(args: {
            sessionKey: Address;
            targetAddress: Address;
        }) {
            return await queryIsWhitelistFrom4337ModuleAddress({
                chain: client.chain as Chain,
                smartAccountAddress: client.account?.address as Address,
                safe4337SessionKeysModule: client?.account
                    ?.safe4337SessionKeysModule as Address,
                sessionKey: args.sessionKey,
                targetAddress: args.targetAddress,
                rpcUrl,
            });
        },
    });
