import { safe4337SessionKeyModuleAbi } from "@/core/accounts/safe/abi/safe4337SessionKeyModuleAbi";
import { defaultEncryptionSalt } from "@/core/signers/ecdsa/services/ecdsaService";
import {
    deleteSessionKeyInStorage,
    getSessionKeySignerFromLocalStorage,
} from "@/core/signers/ecdsa/sessionKeyEoa/sessionKeyEoaService";
import type { FallbackEoaSigner } from "@/core/signers/types";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    createPublicClient,
    getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
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

    for (const tx of txs) {
        const isWhitelisted = await queryIsWhitelistFrom4337ModuleAddress({
            chain,
            smartAccountAddress: smartAccountAddress,
            safe4337SessionKeysModule: safe4337SessionKeysModule,
            sessionKey,
            rpcUrl,
            targetAddress: tx.to,
        });

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

    return (await safe4337SessionKeyModuleContract.read.whitelistDestinations([
        args.sessionKey,
        args.targetAddress,
    ])) as boolean;
};

export const getSessionKeySigner = async ({
    chain,
    safe4337SessionKeysModule,
    rpcUrl,
    smartAccountAddress,
}: {
    smartAccountAddress?: Address;
    chain: Chain;
    safe4337SessionKeysModule: Address;
    rpcUrl?: string;
}): Promise<FallbackEoaSigner | undefined> => {
    if (!smartAccountAddress) return undefined;

    const privateKey =
        await getSessionKeySignerFromLocalStorage(smartAccountAddress);

    if (!privateKey) return undefined;

    const signer = privateKeyToAccount(privateKey);

    const session = await querySessionFrom4337ModuleAddress({
        chain,
        smartAccountAddress,
        safe4337SessionKeysModule,
        sessionKey: signer.address,
        rpcUrl,
    });

    try {
        const now = new Date();
        const validAfter = new Date(session.validAfter);
        const validUntil = new Date(session.validUntil);

        if (session.revoked) throw new Error("Session key has been revoked");
        if (validAfter > now) throw new Error("Session key is not yet valid");
        if (validUntil < now) throw new Error("Session key is expired");
    } catch (err) {
        console.info(err);
        deleteSessionKeyInStorage(smartAccountAddress);
        return undefined;
    }

    return {
        type: "localWallet",
        eoaFallback: {
            privateKey,
            signer: privateKeyToAccount(privateKey),
            encryptionSalt: defaultEncryptionSalt,
        },
    };
};
