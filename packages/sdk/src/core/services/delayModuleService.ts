import {
    type Address,
    type Hex,
    type PublicClient,
    concat,
    encodeAbiParameters,
    encodeFunctionData,
    getContractAddress,
    keccak256,
    pad,
    parseAbiParameters,
} from "viem";
import { delayModuleABI } from "../accounts/safe/abi/delayModule";

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
    client: PublicClient;
}): Promise<boolean> => {
    try {
        await client.getBytecode({ address: delayAddress });
        return true;
    } catch (error) {
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
): Promise<any> => {
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
    client: PublicClient
): Promise<RecoveryParamsResponse> => {
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
    client: PublicClient
): Promise<boolean> => {
    const [txNonce, queueNonce] = await Promise.all([
        client.readContract({
            address: moduleAddress,
            abi: delayModuleABI,
            functionName: "txNonce",
        }),
        client.readContract({
            address: moduleAddress,
            abi: delayModuleABI,
            functionName: "queueNonce",
        }),
    ]);

    return txNonce === queueNonce;
};

export default {
    getDelayAddress,
    isDeployed,
    createSetTxNonceFunction,
    getCurrentRecoveryParams,
    isQueueEmpty,
};
