import { safe4337SessionKeyModuleAbi } from "@/core/accounts/safe/abi/safe4337SessionKeyModuleAbi";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    createPublicClient,
    getContract,
} from "viem";
import { decodeUserOp } from "../../../../accounts/safe/services/safe";

export type Session = {
    account: Address;
    validAfter: number;
    validUntil: number;
    revoked: boolean;
};

export type AddSessionKeyParams = {
    validAfter?: Date;
    validUntil?: Date;
    destinations: Address[];
};

export const isUserOpWhitelisted = async ({
    chain,
    userOperation,
    safe4337SessionKeysModule,
    multisend,
    smartAccountAddress,
    sessionKey,
    rpcUrl,
}: {
    chain: Chain;
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    userOperation: any;
    safe4337SessionKeysModule: Address;
    multisend: Address;
    smartAccountAddress: Address;
    sessionKey: Address;
    rpcUrl?: string;
}): Promise<boolean> => {
    const txs = await decodeUserOp({ userOperation, multisend });

    console.log({ txs });

    for (const tx of txs) {
        const isWhitelisted = await queryIsWhitelistFrom4337ModuleAddress({
            chain,
            smartAccountAddress: smartAccountAddress,
            safe4337SessionKeysModule: safe4337SessionKeysModule,
            sessionKey,
            rpcUrl,
            targetAddress: tx.to,
        });

        console.log({ isWhitelisted });

        if (!isWhitelisted) return false;
    }

    return true;
};

export const querySessionFrom4337ModuleAddress = async (args: {
    chain: Chain;
    smartAccountAddress: Address;
    safe4337SessionKeysModule: Address;
    sessionKey: Address;
    rpcUrl?: string;
}) => {
    const publicClient = createPublicClient({
        chain: args.chain,
        transport: http(args?.rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const isDeployed = await isSmartAccountDeployed(
        publicClient,
        args.smartAccountAddress
    );

    if (!isDeployed) throw new Error("Smart account is not deployed.");

    const safe4337SessionKeyModuleContract = getContract({
        address: args.safe4337SessionKeysModule,
        abi: safe4337SessionKeyModuleAbi,
        client: publicClient,
    });

    return (await safe4337SessionKeyModuleContract.read.sessionKeys([
        args.sessionKey,
    ])) as Session;
};

export const queryIsWhitelistFrom4337ModuleAddress = async (args: {
    chain: Chain;
    smartAccountAddress: Address;
    safe4337SessionKeysModule: Address;
    sessionKey: Address;
    targetAddress: Address;
    rpcUrl?: string;
}) => {
    const publicClient = createPublicClient({
        chain: args.chain,
        transport: http(args?.rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    console.log(args.smartAccountAddress);

    const isDeployed = await isSmartAccountDeployed(
        publicClient,
        args.smartAccountAddress
    );

    console.log({ isDeployed });

    if (!isDeployed) throw new Error("Smart account is not deployed.");

    const safe4337SessionKeyModuleContract = getContract({
        address: args.safe4337SessionKeysModule,
        abi: safe4337SessionKeyModuleAbi,
        client: publicClient,
    });

    const isWhi =
        await safe4337SessionKeyModuleContract.read.whitelistDestinations([
            args.sessionKey,
            args.targetAddress,
        ]);

    console.log({ isWhi });

    return isWhi as boolean;
};
