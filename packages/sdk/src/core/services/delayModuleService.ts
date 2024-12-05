import { SENTINEL_MODULES } from "@/constants";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type PublicClient,
    concat,
    createPublicClient,
    encodeAbiParameters,
    encodeFunctionData,
    getAddress,
    getContractAddress,
    keccak256,
    pad,
    parseAbiParameters,
} from "viem";
import { getCode } from "viem/actions";
import { delayModuleABI } from "../accounts/safe/abi/delayModule";
import { delayModuleFactoryABI } from "../accounts/safe/abi/delayModuleFactory";
import type { MultiSendTransaction } from "../types";

export type RecoveryParamsResponse = {
    txCreatedAt: bigint;
    txHash: string;
};

export type DelayContext = {
    delayModuleAddress: Address;
    moduleFactoryAddress: Address;
    recoveryCooldown: number;
    recoveryExpiration: number;
};

const isDeployed = async ({
    delayAddress,
    client,
}: {
    delayAddress: Address;
    client: Client;
}): Promise<boolean> => {
    try {
        const bytecode = await getCode(client, {
            address: delayAddress,
        });

        if (!bytecode) return false;

        return true;
    } catch {
        return false;
    }
};

const getDelayAddress = (safe: Address, context: DelayContext): Address => {
    const cooldown = context.recoveryCooldown;
    const expiration = context.recoveryExpiration;
    const moduleAddress = context.delayModuleAddress;
    const factoryAddress = context.moduleFactoryAddress;

    const args = encodeFunctionData({
        abi: delayModuleABI,
        functionName: "setUp",
        args: [
            encodeAbiParameters(
                parseAbiParameters(
                    "address, address, address, uint256, uint256"
                ),
                [safe, safe, safe, BigInt(cooldown), BigInt(expiration)]
            ),
        ],
    });

    const initializer = args;

    const code = concat([
        "0x602d8060093d393df3363d3d373d3d3d363d73" as Hex,
        moduleAddress.slice(2) as Hex,
        "5af43d82803e903d91602b57fd5bf3" as Hex,
    ]);

    const salt = keccak256(
        concat([keccak256(initializer), pad(safe, { size: 32 })])
    );

    return getContractAddress({
        bytecode: code,
        from: factoryAddress,
        salt,
        opcode: "CREATE2",
    });
};

const createSetTxNonceFunction = async (
    proxyDelayAddress: Address,
    client: PublicClient
): Promise<MultiSendTransaction> => {
    const txNonce = await client.readContract({
        address: proxyDelayAddress,
        abi: delayModuleABI,
        functionName: "txNonce",
    });

    const newNonce = txNonce + 1n;

    return {
        to: proxyDelayAddress,
        value: "0x0",
        data: encodeFunctionData({
            abi: delayModuleABI,
            functionName: "setTxNonce",
            args: [newNonce],
        }),
        operation: 0,
    };
};

const getCurrentRecoveryParams = async (
    delayModuleAddress: Address,
    chain: Chain,
    rpcUrl?: string
): Promise<RecoveryParamsResponse> => {
    const client = createPublicClient({
        chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const txNonce = await client.readContract({
        address: delayModuleAddress,
        abi: delayModuleABI,
        functionName: "txNonce",
    });

    const [txCreatedAt, txHash] = await Promise.all([
        client.readContract({
            address: delayModuleAddress,
            abi: delayModuleABI,
            functionName: "getTxCreatedAt",
            args: [txNonce],
        }),
        client.readContract({
            address: delayModuleAddress,
            abi: delayModuleABI,
            functionName: "getTxHash",
            args: [txNonce],
        }),
    ]);

    return { txCreatedAt, txHash };
};

const isQueueEmpty = async (
    moduleAddress: Address,
    chain: Chain,
    rpcUrl?: string
): Promise<boolean> => {
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const [txNonce, queueNonce] = await Promise.all([
        publicClient.readContract({
            address: moduleAddress,
            abi: delayModuleABI,
            functionName: "txNonce",
        }),
        publicClient.readContract({
            address: moduleAddress,
            abi: delayModuleABI,
            functionName: "queueNonce",
        }),
    ]);

    return txNonce === queueNonce;
};

const setUpDelayModule = async ({
    safe,
    cooldown,
    expiration,
}: {
    safe: Address;
    cooldown: number;
    expiration: number;
}): Promise<string> => {
    const setUpArgs = encodeAbiParameters(
        parseAbiParameters([
            "address",
            "address",
            "address",
            "uint256",
            "uint256",
        ]),
        [safe, safe, safe, BigInt(cooldown), BigInt(expiration)]
    );

    return encodeFunctionData({
        abi: delayModuleABI,
        functionName: "setUp",
        args: [setUpArgs],
    });
};

const encodeDeployDelayModule = ({
    singletonDelayModule,
    initializer,
    safe,
}: {
    singletonDelayModule: Address;
    initializer: Hex;
    safe: Address;
}): string => {
    return encodeFunctionData({
        abi: delayModuleFactoryABI,
        functionName: "deployModule",
        args: [singletonDelayModule, initializer, BigInt(safe)],
    });
};

const getGuardianAddress = async ({
    delayAddress,
    chain,
    rpcUrl,
}: {
    delayAddress: Address;
    chain: Chain;
    rpcUrl?: string;
}): Promise<Address> => {
    const client = createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
    });

    const modulesPaginated = await client.readContract({
        address: delayAddress,
        abi: delayModuleABI,
        functionName: "getModulesPaginated",
        args: [SENTINEL_MODULES, 1n],
    });

    return modulesPaginated[0][0];
};

const findPrevModule = async ({
    delayAddress,
    targetModule,
    chain,
    rpcUrl,
}: {
    delayAddress: Address;
    targetModule: Address;
    chain: Chain;
    rpcUrl?: string;
}): Promise<Address> => {
    const client = createPublicClient({
        chain,
        transport: http(rpcUrl),
    });

    const moduleList = await client.readContract({
        address: delayAddress,
        abi: delayModuleABI,
        functionName: "getModulesPaginated",
        args: [SENTINEL_MODULES, 1000n],
    });

    const index = moduleList[0].findIndex(
        (moduleToFind) =>
            moduleToFind.toLowerCase() === targetModule.toLowerCase()
    );

    if (index === -1) {
        throw new Error("Address is not a guardian");
    }

    return index !== 0
        ? getAddress(moduleList[0][index - 1])
        : getAddress(SENTINEL_MODULES);
};

export default {
    getDelayAddress,
    isDeployed,
    createSetTxNonceFunction,
    getCurrentRecoveryParams,
    isQueueEmpty,
    setUpDelayModule,
    encodeDeployDelayModule,
    getGuardianAddress,
    findPrevModule,
};
