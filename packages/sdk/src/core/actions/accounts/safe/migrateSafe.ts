import { MigrationAbi } from "@/core/accounts/safe/abi/Migration";
import { MultiSendContractABI } from "@/core/accounts/safe/abi/Multisend";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { encodeMultiSendTransactions } from "@/core/accounts/safe/services/safe";
import { EIP712_SAFE_TX_TYPES } from "@/core/accounts/safe/types";
import {
    http,
    type Address,
    type Chain,
    type Hash,
    type PublicClient,
    type WalletClient,
    createPublicClient,
    encodeFunctionData,
    getAddress,
    zeroAddress,
} from "viem";

// L2 specific addresses
const SAFE_4337_MODULE_ADDRESS =
    "0x6b6454B66964a466DfBeF991379AA4034ea64A2f" as const;
const MULTI_SEND_ADDRESS =
    "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761" as const;
const MIGRATION_CONTRACT =
    "0x316D2c18294A4A58056F5EFf80EF3D8Cc286fF92" as const;

const GAS_GAP_TOLERANCE = 10n; // Assuming this is defined elsewhere, converting to BigInt
const DEFAULT_REWARD_PERCENTILE = 80;
const DEFAULT_BASE_GAS = 80000;

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

async function executeTransaction(
    publicClient: PublicClient,
    walletClient: WalletClient,
    safeAddress: Address,
    tx: {
        to: Address;
        value: bigint;
        data: `0x${string}`;
        operation: number;
    }
): Promise<Hash> {
    const nonce = (await publicClient.readContract({
        address: safeAddress,
        abi: SafeAbi,
        functionName: "nonce",
    })) as number;

    const gasPrice = await getGasPrice(publicClient, DEFAULT_REWARD_PERCENTILE);

    const fullTx = {
        ...tx,
        safeTxGas: BigInt(200000),
        baseGas: BigInt(DEFAULT_BASE_GAS),
        gasPrice: gasPrice,
        gasToken: getAddress(zeroAddress),
        refundReceiver: getAddress(zeroAddress),
        nonce: BigInt(nonce),
    };

    const signerAddress = getAddress(walletClient.account?.address!) as Address;
    const chainId = await publicClient.getChainId();

    const signature = await walletClient.signTypedData({
        domain: {
            chainId: chainId,
            verifyingContract: getAddress(safeAddress) as Address,
        },
        types: EIP712_SAFE_TX_TYPES,
        primaryType: "SafeTx",
        message: fullTx,
        account: signerAddress,
    });

    const { request } = await publicClient.simulateContract({
        account: signerAddress,
        address: safeAddress,
        abi: SafeAbi,
        functionName: "execTransaction",
        args: [
            fullTx.to,
            fullTx.value,
            fullTx.data,
            fullTx.operation,
            fullTx.safeTxGas,
            fullTx.baseGas,
            fullTx.gasPrice,
            fullTx.gasToken,
            fullTx.refundReceiver,
            signature,
        ],
    });

    const txHash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return txHash;
}

async function getGasPrice(
    publicClient: PublicClient,
    rewardPercentile: number
): Promise<bigint> {
    const feeHistory = await publicClient.getFeeHistory({
        blockCount: 1,
        rewardPercentiles: [rewardPercentile],
    });

    if (!feeHistory.reward![0] || feeHistory.baseFeePerGas.length === 0) {
        throw new Error("Failed to fetch fee history");
    }

    const reward = feeHistory.reward![0][0];
    const baseFee = feeHistory.baseFeePerGas[0];

    if (reward === undefined || baseFee === undefined) {
        throw new Error("Invalid fee history data");
    }

    return reward + baseFee + (reward + baseFee) / GAS_GAP_TOLERANCE;
}
