import type { Signer } from "@/core/signers/types";
import { SafeNotDeployedError } from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Hex,
    type PublicClient,
    concat,
    createPublicClient,
    encodeFunctionData,
    encodePacked,
    getContract,
    getContractAddress,
    hexToBigInt,
    keccak256,
    size,
    zeroAddress,
} from "viem";
import { MultiSendContractABI } from "../abi/Multisend";
import { EnableModuleAbi } from "../abi/enableModule";
import { SafeAbi } from "../abi/safe";
import { SafeProxyContractFactoryABI } from "../abi/safeProxyFactory";
import type { MultiSendTransaction } from "../types";

/**
 * Encodes multiple transactions into a single byte string for multi-send functionality
 * @param transactions - Array of MultiSendTransaction objects
 * @returns Concatenated and encoded transactions as a Hex string
 */
export const encodeMultiSendTransactions = (
    transactions: MultiSendTransaction[]
) => {
    return concat(
        transactions.map(({ op, to, value, data }) =>
            encodePacked(
                ["uint8", "address", "uint256", "uint256", "bytes"],
                [op, to, value ?? 0n, BigInt(size(data)), data as `0x${string}`]
            )
        )
    );
};

/**
 * Generates setup data for enabling modules and configuring the signer
 * @param modules - Array of module addresses to enable
 * @returns Encoded setup data as a Hex string
 */
export const getSetUpCallData = ({
    modules,
    setUpContractAddress,
    setupTransactions,
}: {
    modules: Address[];
    setUpContractAddress: Address;
    setupTransactions?: MultiSendTransaction[];
}) => {
    const enableModuleCallData = encodeFunctionData({
        abi: EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    });

    if (setupTransactions) {
        return encodeFunctionData({
            abi: MultiSendContractABI,
            functionName: "multiSend",
            args: [
                encodeMultiSendTransactions([
                    {
                        op: 1 as const,
                        to: setUpContractAddress,
                        data: enableModuleCallData,
                    },
                    ...setupTransactions.map((tx) => ({
                        op: tx.op as 0 | 1,
                        to: tx.to,
                        value: tx.value ?? 0n,
                        data: tx.data,
                    })),
                ]),
            ],
        });
    }

    return enableModuleCallData;
};

/**
 * Generates the initializer data for a Safe smart contract
 * @param accountSigner - The signer instance
 * @param threshold - The threshold for the multi-signature wallet
 * @param fallbackHandler - Address of the fallback handler
 * @param modules - Array of module addresses to enable
 * @param setUpContractAddress - Address of the setup contract
 * @returns Encoded initializer data as a Hex string
 */
export const getSafeInitializer = ({
    accountSigner,
    threshold,
    fallbackHandler,
    modules,
    setUpContractAddress,
    multisendAddress,
    setupTransactions,
}: {
    accountSigner: Signer;
    threshold: number;
    fallbackHandler: Address;
    modules: Address[];
    setUpContractAddress: Address;
    multisendAddress: Address;
    setupTransactions?: MultiSendTransaction[];
}): Hex => {
    const setUpCallData = getSetUpCallData({
        modules,
        setUpContractAddress,
        setupTransactions,
    });

    if (setupTransactions && setupTransactions.length > 0) {
        return getSafeSetUpData({
            owner: accountSigner.address,
            threshold,
            setUpContractAddress: multisendAddress,
            setUpData: setUpCallData,
            fallbackHandler,
        });
    }

    return getSafeSetUpData({
        owner: accountSigner.address,
        threshold,
        setUpContractAddress,
        setUpData: setUpCallData,
        fallbackHandler,
    });
};

/**
 * Calculates the Safe address based on the initializer data
 * @param chain - The blockchain network
 * @param publicClient - The public client
 * @param safeProxyFactoryAddress - Address of the Safe proxy factory
 * @param safeSingletonAddress - Address of the Safe singleton
 * @param initializer - Initializer data for the Safe contract
 * @param saltNonce - Salt nonce for address generation
 * @returns The calculated address of the Safe contract
 */
export const getSafeAddressFromInitializer = async ({
    chain,
    publicClient,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    initializer,
    saltNonce,
}: {
    chain: Chain;
    publicClient?: PublicClient;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    initializer: Hex;
    saltNonce: bigint;
}) => {
    const publicClient_ =
        publicClient ??
        createPublicClient({
            chain,
            transport: http(),
        });

    const proxyCreationCode = (await publicClient_.readContract({
        address: safeProxyFactoryAddress,
        abi: SafeProxyContractFactoryABI,
        functionName: "proxyCreationCode",
    })) as Hex;

    const deploymentCode = encodePacked(
        ["bytes", "uint256"],
        [proxyCreationCode, hexToBigInt(safeSingletonAddress)]
    );

    const salt = keccak256(
        encodePacked(
            ["bytes32", "uint256"],
            [keccak256(encodePacked(["bytes"], [initializer])), saltNonce]
        )
    );

    return getContractAddress({
        bytecode: deploymentCode,
        from: safeProxyFactoryAddress,
        opcode: "CREATE2",
        salt,
    });
};

/**
 * Generates the setup data for a Safe smart contract
 * @param owner - Address of the owner
 * @param threshold - The threshold for the multi-signature wallet
 * @param setUpContractAddress - Address of the setup contract
 * @param setUpData - Encoded setup data
 * @param fallbackHandler - Address of the fallback handler
 * @returns Encoded setup data as a Hex string
 */
export const getSafeSetUpData = ({
    owner,
    threshold,
    setUpContractAddress,
    setUpData,
    fallbackHandler,
}: {
    owner: Address;
    threshold: number;
    setUpContractAddress: Address;
    setUpData: Hex;
    fallbackHandler: Address;
}): Hex => {
    return encodeFunctionData({
        abi: SafeAbi,
        functionName: "setup",
        args: [
            [owner],
            threshold,
            setUpContractAddress,
            setUpData,
            fallbackHandler,
            zeroAddress,
            0,
            zeroAddress,
        ],
    });
};

export const isModuleEnabled = async ({
    client,
    safeAddress,
    moduleAddress,
}: {
    client: PublicClient;
    safeAddress: Address;
    moduleAddress: Address;
}) => {
    const safe = getContract({
        address: safeAddress,
        abi: SafeAbi,
        client,
    });

    const isDeployed = await isSmartAccountDeployed(client, safeAddress);

    if (!isDeployed) throw new SafeNotDeployedError();

    return await safe.read.isModuleEnabled([moduleAddress]);
};
