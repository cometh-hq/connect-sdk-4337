import { MultiSendContractABI } from "@/core/accounts/safe/abi/Multisend";
import { MigrationAbi } from "@/core/accounts/safe/abi/migration";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import {
    encodeMultiSendTransactions,
    executeTransaction,
} from "@/core/accounts/safe/services/safe";
import {
    http,
    type Address,
    type Chain,
    type Hash,
    type WalletClient,
    createPublicClient,
    encodeFunctionData,
} from "viem";

const SAFE_4337_MODULE_ADDRESS =
    "0x6b6454B66964a466DfBeF991379AA4034ea64A2f" as const;
const MULTI_SEND_ADDRESS =
    "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761" as const;
const MIGRATION_CONTRACT =
    "0x316D2c18294A4A58056F5EFf80EF3D8Cc286fF92" as const;

type SafeMigrationConfig = {
    SAFE_4337_MODULE_ADDRESS: Address;
    MULTI_SEND_ADDRESS: Address;
    MIGRATION_CONTRACT: Address;
};

export const migrateSafeV3toV4 = async ({
    walletClient,
    safeAddress,
    chain,
    rpcUrl,
    safeContractConfig = {
        SAFE_4337_MODULE_ADDRESS,
        MULTI_SEND_ADDRESS,
        MIGRATION_CONTRACT,
    },
}: {
    walletClient: WalletClient;
    safeAddress: Address;
    chain: Chain;
    rpcUrl?: string;
    safeContractConfig?: SafeMigrationConfig;
}): Promise<Hash> => {
    const publicClient = createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    // 1. Verify current version
    const currentVersion = await publicClient.readContract({
        address: safeAddress,
        abi: SafeAbi,
        functionName: "VERSION",
    });

    if (currentVersion !== "1.3.0") {
        throw new Error(
            `Safe is not version 1.3.0. Current version: ${currentVersion}`
        );
    }

    // 2. Prepare migration transaction
    const migrateData = encodeFunctionData({
        abi: MigrationAbi,
        functionName: "migrate",
    });

    const setFallbackData = encodeFunctionData({
        abi: SafeAbi,
        functionName: "setFallbackHandler",
        args: [safeContractConfig.SAFE_4337_MODULE_ADDRESS],
    });

    const enableModuleData = encodeFunctionData({
        abi: SafeAbi,
        functionName: "enableModule",
        args: [safeContractConfig.SAFE_4337_MODULE_ADDRESS],
    });

    const transactions = [
        {
            to: safeContractConfig.MIGRATION_CONTRACT,
            value: 0n,
            data: migrateData,
            op: 1,
        },
        {
            to: safeAddress,
            value: 0n,
            data: setFallbackData,
            op: 0,
        },
        {
            to: safeAddress,
            value: 0n,
            data: enableModuleData,
            op: 0,
        },
    ];

    const multiSendData = encodeFunctionData({
        abi: MultiSendContractABI,
        functionName: "multiSend",
        args: [encodeMultiSendTransactions(transactions)],
    });

    // 3. Execute MultiSend transaction
    const txHash = await executeTransaction(
        publicClient,
        walletClient,
        safeAddress,
        {
            to: safeContractConfig.MULTI_SEND_ADDRESS,
            value: BigInt(0),
            data: multiSendData,
            operation: 1, // DelegateCall
        }
    );

    // 4. Verify new version
    const newVersion = await publicClient.readContract({
        address: safeAddress,
        abi: SafeAbi,
        functionName: "VERSION",
    });

    if (newVersion !== "1.4.1") {
        throw new Error(`Migration failed. New version: ${newVersion}`);
    }

    // 6. Verify module is enabled
    const isModuleEnabled = await publicClient.readContract({
        address: safeAddress,
        abi: SafeAbi,
        functionName: "isModuleEnabled",
        args: [safeContractConfig.SAFE_4337_MODULE_ADDRESS],
    });

    if (!isModuleEnabled) {
        throw new Error(`4337 module not enabled`);
    }

    return txHash;
};
