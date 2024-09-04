import type { ComethSigner } from "@/core/signers/types";
import type { UserOperation } from "@/core/types";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Hex,
    concat,
    createPublicClient,
    decodeFunctionData,
    encodeFunctionData,
    encodePacked,
    getAddress,
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
import { safe4337SessionKeyModuleAbi } from "../abi/safe4337SessionKeyModuleAbi";
import { SafeProxyContractFactoryABI } from "../abi/safeProxyFactory";
import { SafeWebAuthnSharedSignerAbi } from "../abi/sharedWebAuthnSigner";
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
 * Decodes a user operation into an array of MultiSendTransactions
 * @param userOperation - The user operation to decode
 * @param multisend - The address of the multisend contract
 * @returns An array of decoded MultiSendTransaction objects
 */
export const decodeUserOp = ({
    userOperation,
    multisend,
}: {
    userOperation: UserOperation;
    multisend: Address;
}): MultiSendTransaction[] => {
    const { args } = decodeFunctionData({
        abi: safe4337SessionKeyModuleAbi,
        data: userOperation.callData as `0x${string}`,
    });

    if (!args) throw new Error("Invalid callData for Safe Account");

    const txs: MultiSendTransaction[] = [];

    if (args[0] === multisend) {
        const decodedData = decodeFunctionData({
            abi: MultiSendContractABI,
            data: args[2] as `0x${string}`,
        });

        const multisendArgs = decodedData.args[0];

        // Decode after 0x
        let index = 2;

        while (index < multisendArgs.length) {
            // As we are decoding hex encoded bytes calldata, each byte is represented by 2 chars
            // uint8 operation, address to, value uint256, dataLength uint256

            const operation = `0x${multisendArgs.slice(index, index + 2)}`;
            index += 2;
            const to = `0x${multisendArgs.slice(index, index + 40)}`;
            index += 40;
            const value = `0x${multisendArgs.slice(index, index + 64)}`;
            index += 64;
            const dataLength =
                parseInt(multisendArgs.slice(index, index + 64), 16) * 2;
            index += 64;
            const data = `0x${multisendArgs.slice(
                index,
                index + dataLength
            )}` as Hex;
            index += dataLength;

            txs.push({
                op: Number(operation) as 0 | 1,
                to: getAddress(to),
                value: BigInt(value),
                data,
            });
        }
    } else {
        txs.push({
            to: args[0] as Address,
            value: args[1] as bigint,
            data: args[2] as Hex,
            op: args[3] as 0 | 1,
        });
    }

    return txs;
};

/**
 * Generates setup data for enabling modules and configuring the signer
 * @param modules - Array of module addresses to enable
 * @param comethSigner - The Cometh signer instance
 * @param setUpContractAddress - Address of the setup contract
 * @param safeWebAuthnSharedSignerContractAddress - Address of the WebAuthn shared signer contract
 * @param safeP256VerifierAddress - Address of the P256 verifier contract
 * @returns Encoded setup data as a Hex string
 */
export const getSetUpCallData = ({
    modules,
    comethSigner,
    setUpContractAddress,
    safeWebAuthnSharedSignerContractAddress,
    safeP256VerifierAddress,
}: {
    modules: Address[];
    comethSigner: ComethSigner;
    setUpContractAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    safeP256VerifierAddress: Address;
}) => {
    const enableModuleCallData = encodeFunctionData({
        abi: EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    });

    if (comethSigner.type === "passkey") {
        const sharedSignerConfigCallData = encodeFunctionData({
            abi: SafeWebAuthnSharedSignerAbi,
            functionName: "configure",
            args: [
                {
                    x: hexToBigInt(comethSigner.passkey.pubkeyCoordinates.x),
                    y: hexToBigInt(comethSigner.passkey.pubkeyCoordinates.y),
                    verifiers: hexToBigInt(safeP256VerifierAddress),
                },
            ],
        });

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
                    {
                        op: 1 as const,
                        to: safeWebAuthnSharedSignerContractAddress,
                        data: sharedSignerConfigCallData,
                    },
                ]),
            ],
        });
    }

    return enableModuleCallData;
};

/**
 * Generates the initializer data for a Safe smart contract
 * @param comethSigner - The Cometh signer instance
 * @param threshold - The threshold for the multi-signature wallet
 * @param fallbackHandler - Address of the fallback handler
 * @param modules - Array of module addresses to enable
 * @param setUpContractAddress - Address of the setup contract
 * @param safeWebAuthnSharedSignerContractAddress - Address of the WebAuthn shared signer contract
 * @param p256Verifier - Address of the P256 verifier contract
 * @param multisendAddress - Address of the multisend contract
 * @returns Encoded initializer data as a Hex string
 */
export const getSafeInitializer = ({
    comethSigner,
    threshold,
    fallbackHandler,
    modules,
    setUpContractAddress,
    safeWebAuthnSharedSignerContractAddress,
    p256Verifier,
    multisendAddress,
}: {
    comethSigner: ComethSigner;
    threshold: number;
    fallbackHandler: Address;
    modules: Address[];
    setUpContractAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    p256Verifier: Address;
    multisendAddress: Address;
}): Hex => {
    const setUpCallData = getSetUpCallData({
        modules,
        comethSigner,
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress:
            safeWebAuthnSharedSignerContractAddress,
        safeP256VerifierAddress: p256Verifier,
    });

    if (comethSigner.type === "localWallet") {
        return getSafeSetUpData({
            owner: comethSigner.eoaFallback.signer.address,
            threshold,
            setUpContractAddress,
            setUpData: setUpCallData,
            fallbackHandler,
        });
    }

    return getSafeSetUpData({
        owner: safeWebAuthnSharedSignerContractAddress,
        threshold,
        setUpContractAddress: multisendAddress,
        setUpData: setUpCallData,
        fallbackHandler,
    });
};

/**
 * Checks if a given address is an owner of a Safe smart contract
 * @param safeAddress - Address of the Safe contract
 * @param comethSigner - The Cometh signer instance
 * @param chain - The blockchain network
 * @param safeProxyFactoryAddress - Address of the Safe proxy factory
 * @param safeSingletonAddress - Address of the Safe singleton
 * @param safeModuleSetUpAddress - Address of the Safe module setup
 * @param fallbackHandler - Address of the fallback handler
 * @param modules - Array of module addresses
 * @param sharedWebAuthnSignerContractAddress - Address of the shared WebAuthn signer contract
 * @param p256Verifier - Address of the P256 verifier
 * @param multisendAddress - Address of the multisend contract
 * @param rpcUrl - Optional RPC URL for the network
 * @returns A boolean indicating whether the address is an owner
 */
export const isSafeOwner = async ({
    safeAddress,
    comethSigner,
    chain,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    safeModuleSetUpAddress,
    fallbackHandler,
    modules,
    sharedWebAuthnSignerContractAddress,
    p256Verifier,
    multisendAddress,
    rpcUrl,
}: {
    safeAddress: Address;
    comethSigner: ComethSigner;
    chain: Chain;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    safeModuleSetUpAddress: Address;
    fallbackHandler: Address;
    modules: Address[];
    sharedWebAuthnSignerContractAddress: Address;
    p256Verifier: Address;
    multisendAddress: Address;
    rpcUrl?: string;
}): Promise<boolean> => {
    const signerAddress =
        comethSigner.type === "localWallet"
            ? comethSigner.eoaFallback.signer.address
            : comethSigner.passkey.signerAddress;

    try {
        const publicClient = createPublicClient({
            chain: chain,
            transport: http(rpcUrl),
        });

        const safe = getContract({
            address: safeAddress,
            abi: SafeAbi,
            client: publicClient,
        });

        const isDeployed = await isSmartAccountDeployed(
            publicClient,
            safeAddress
        );

        if (!isDeployed) throw new Error("Safe not deployed");

        return (await safe.read.isOwner([signerAddress])) as boolean;
    } catch {
        const predictedWalletAddress = await predictSafeAddress({
            saltNonce: 0n,
            chain,
            comethSigner,
            safeProxyFactoryAddress,
            safeSingletonAddress,
            setUpContractAddress: safeModuleSetUpAddress,
            fallbackHandler,
            p256Verifier,
            modules,
            multisendAddress,
            threshold: 1,
            sharedWebAuthnSignerContractAddress,
        });

        if (predictedWalletAddress !== safeAddress) return false;
    }

    return true;
};

/**
 * Predicts the address of a Safe smart contract before deployment
 * @param saltNonce - Salt nonce for address generation
 * @param chain - The blockchain network
 * @param comethSigner - The Cometh signer instance
 * @param fallbackHandler - Address of the fallback handler
 * @param modules - Array of module addresses
 * @param setUpContractAddress - Address of the setup contract
 * @param safeSingletonAddress - Address of the Safe singleton
 * @param safeProxyFactoryAddress - Address of the Safe proxy factory
 * @param sharedWebAuthnSignerContractAddress - Address of the shared WebAuthn signer contract
 * @param p256Verifier - Address of the P256 verifier
 * @param multisendAddress - Address of the multisend contract
 * @param threshold - Optional threshold for the multi-signature wallet
 * @param rpcUrl - Optional RPC URL for the network
 * @returns The predicted address of the Safe contract
 */
export const predictSafeAddress = async ({
    saltNonce,
    chain,
    comethSigner,
    fallbackHandler,
    modules,
    setUpContractAddress,
    safeSingletonAddress,
    safeProxyFactoryAddress,
    sharedWebAuthnSignerContractAddress,
    p256Verifier,
    multisendAddress,
    threshold = 1,
    rpcUrl,
}: {
    saltNonce: bigint;
    chain: Chain;
    comethSigner: ComethSigner;
    safeSingletonAddress: Address;
    safeProxyFactoryAddress: Address;
    fallbackHandler: Address;
    sharedWebAuthnSignerContractAddress: Address;
    setUpContractAddress: Address;
    threshold?: number;
    p256Verifier: Address;
    modules: Address[];
    multisendAddress: Address;
    rpcUrl?: string;
}): Promise<Address> => {
    const initializer = getSafeInitializer({
        comethSigner,
        threshold,
        fallbackHandler,
        modules,
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress:
            sharedWebAuthnSignerContractAddress,
        p256Verifier,
        multisendAddress,
    });

    return getSafeAddressFromInitializer({
        chain,
        rpcUrl,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        initializer,
        saltNonce,
    });
};

/**
 * Calculates the Safe address based on the initializer data
 * @param chain - The blockchain network
 * @param rpcUrl - Optional RPC URL for the network
 * @param safeProxyFactoryAddress - Address of the Safe proxy factory
 * @param safeSingletonAddress - Address of the Safe singleton
 * @param initializer - Initializer data for the Safe contract
 * @param saltNonce - Salt nonce for address generation
 * @returns The calculated address of the Safe contract
 */
export const getSafeAddressFromInitializer = async ({
    chain,
    rpcUrl,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    initializer,
    saltNonce,
}: {
    chain: Chain;
    rpcUrl?: string;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    initializer: Hex;
    saltNonce: bigint;
}) => {
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
    });

    const proxyCreationCode = (await publicClient.readContract({
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
