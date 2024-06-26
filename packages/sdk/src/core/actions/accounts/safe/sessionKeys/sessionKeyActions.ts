import { safe4337SessionKeyModuleAbi } from "@/core/accounts/safe/abi/safe4337SessionKeyModuleAbi";
import { createFallbackEoaSigner } from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import { encryptSessionKeyInStorage } from "@/core/signers/ecdsa/sessionKeyEoa/sessionKeyEoaService";
import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/_types/types";
import type { SmartAccount } from "permissionless/accounts";
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
        rpcUrl?: string;
    }) => Promise<Session>;
    addWhitelistDestination: (args: {
        sessionKey: Address;
        destinations: Address[];
    }) => Promise<Hash>;
    removeWhitelistDestination: (args: {
        sessionKey: Address;
        destination: Address;
    }) => Promise<Hash>;
    isAddressWhitelistDestination: (args: {
        sessionKey: Address;
        targetAddress: Address;
        rpcUrl?: string;
    }) => Promise<boolean>;
};

export const safeSessionKeyActions: <
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends SmartAccount<infer U>
        ? U
        : never,
>(
    client: SmartAccountClient<TEntryPoint, TTransport, TChain, TSmartAccount>
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
) => SafeSessionKeyActions = (client: any) => ({
    async addSessionKey({
        validAfter = defaultValidAfter,
        validUntil = defaultValidUntil,
        destinations,
    }: AddSessionKeyParams) {
        if (destinations.length === 0)
            throw new Error("destinations cannot be empty");

        const fallbackEoaSigner = await createFallbackEoaSigner();

        await encryptSessionKeyInStorage(
            client.account?.address,
            fallbackEoaSigner.privateKey
        );

        return await client.sendTransaction({
            to: client.account?.address,
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
        });
    },

    async revokeSessionKey(args: { sessionKey: Address }) {
        return await client.sendTransaction({
            to: client.account?.address,
            data: encodeFunctionData({
                abi: safe4337SessionKeyModuleAbi,
                functionName: "revokeSessionKey",
                args: [args.sessionKey],
            }),
        });
    },

    async getSessionFromAddress(args: {
        sessionKey: Address;
        rpcUrl?: string;
    }) {
        return await querySessionFrom4337ModuleAddress({
            chain: client.chain,
            smartAccountAddress: client.account?.address,
            safe4337SessionKeysModule: client.account
                .safe4337SessionKeysModule as Address,
            sessionKey: args.sessionKey,
            rpcUrl: args.rpcUrl,
        });
    },

    async addWhitelistDestination(args: {
        sessionKey: Address;
        destinations: Address[];
    }) {
        return await client.sendTransaction({
            to: client.account?.address,
            data: encodeFunctionData({
                abi: safe4337SessionKeyModuleAbi,
                functionName: "addWhitelistDestination",
                args: [args.sessionKey, args.destinations],
            }),
        });
    },

    async removeWhitelistDestination(args: {
        sessionKey: Address;
        destination: Address;
    }) {
        return await client.sendTransaction({
            to: client.account?.address,
            data: encodeFunctionData({
                abi: safe4337SessionKeyModuleAbi,
                functionName: "removeWhitelistDestination",
                args: [args.sessionKey, args.destination],
            }),
        });
    },

    async isAddressWhitelistDestination(args: {
        sessionKey: Address;
        targetAddress: Address;
        rpcUrl?: string;
    }) {
        return await queryIsWhitelistFrom4337ModuleAddress({
            chain: client.chain,
            smartAccountAddress: client.account?.address,
            safe4337SessionKeysModule: client.account
                .safe4337SessionKeysModule as Address,
            sessionKey: args.sessionKey,
            targetAddress: args.targetAddress,
            rpcUrl: args.rpcUrl,
        });
    },
});
