import { getSignerAddress } from "@/core/signers/createSigner";
import type { Signer } from "@/core/signers/types";
import type { UserOperation } from "@/core/types";
import { InvalidCallDataError, SafeNotDeployedError } from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
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

    if (!args) throw new InvalidCallDataError();

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
 * @param accountSigner - The signer instance
 * @param setUpContractAddress - Address of the setup contract
 * @param safeWebAuthnSharedSignerContractAddress - Address of the WebAuthn shared signer contract
 * @param safeP256VerifierAddress - Address of the P256 verifier contract
 * @returns Encoded setup data as a Hex string
 */
export const getSetUpCallData = ({
    modules,
}: {
    modules: Address[];
}) => {
    const enableModuleCallData = encodeFunctionData({
        abi: EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    });

    return enableModuleCallData;
};

/**
 * Generates the initializer data for a Safe smart contract
 * @param accountSigner - The signer instance
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
    accountSigner,
    threshold,
    fallbackHandler,
    modules,
    setUpContractAddress,
}: {
    accountSigner: Signer;
    threshold: number;
    fallbackHandler: Address;
    modules: Address[];
    setUpContractAddress: Address;
}): Hex => {
    const signerAddress = getSignerAddress(accountSigner);

    const setUpCallData = getSetUpCallData({
        modules,
    });

    return getSafeSetUpData({
        owner: signerAddress,
        threshold,
        setUpContractAddress,
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
    accountSigner,
    chain,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    safeModuleSetUpAddress,
    fallbackHandler,
    modules,
    publicClient,
}: {
    safeAddress: Address;
    accountSigner: Signer;
    chain: Chain;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    safeModuleSetUpAddress: Address;
    fallbackHandler: Address;
    modules: Address[];
    publicClient?: PublicClient;
}): Promise<boolean> => {
    const signerAddress = getSignerAddress(accountSigner);

    try {
        const publicClient_ =
            publicClient ??
            createPublicClient({
                chain: chain,
                transport: http(),
            });

        const safe = getContract({
            address: safeAddress,
            abi: SafeAbi,
            client: publicClient_,
        });

        const isDeployed = await isSmartAccountDeployed(
            publicClient_,
            safeAddress
        );

        if (!isDeployed) throw new SafeNotDeployedError();

        return (await safe.read.isOwner([signerAddress])) as boolean;
    } catch {
        const predictedWalletAddress = await predictSafeAddress({
            saltNonce: 0n,
            chain,
            accountSigner,
            safeProxyFactoryAddress,
            safeSingletonAddress,
            setUpContractAddress: safeModuleSetUpAddress,
            fallbackHandler,
            modules,
            threshold: 1,
            publicClient,
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
    accountSigner,
    fallbackHandler,
    modules,
    setUpContractAddress,
    safeSingletonAddress,
    safeProxyFactoryAddress,
    threshold = 1,
    publicClient,
}: {
    saltNonce: bigint;
    chain: Chain;
    accountSigner: Signer;
    safeSingletonAddress: Address;
    safeProxyFactoryAddress: Address;
    fallbackHandler: Address;
    setUpContractAddress: Address;
    threshold?: number;
    modules: Address[];
    publicClient?: PublicClient;
}): Promise<Address> => {
    const initializer = getSafeInitializer({
        accountSigner,
        threshold,
        fallbackHandler,
        modules,
        setUpContractAddress,
    });

    return getSafeAddressFromInitializer({
        chain,
        publicClient,
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

export const prepareImportCalldata = async ({
    threshold,
    safe4337ModuleAddress,
    smartAccountAddress,
    eoaSigner,
    isImport,
    is4337ModuleEnabled,
}: {
    threshold: number;
    safe4337ModuleAddress: Address;
    smartAccountAddress: Address;
    eoaSigner?: PrivateKeyAccount;
    isImport?: boolean;
    is4337ModuleEnabled: boolean;
}) => {
    const transactions = [];

    if (!is4337ModuleEnabled) {
        transactions.push(
            {
                to: smartAccountAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "setFallbackHandler",
                    args: [safe4337ModuleAddress],
                }),
                op: 0,
            },
            {
                to: smartAccountAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "enableModule",
                    args: [safe4337ModuleAddress],
                }),
                op: 0,
            }
        );
    }

    if (isImport) {
        transactions.push({
            to: smartAccountAddress,
            value: 0n,
            data: encodeFunctionData({
                abi: SafeAbi,
                functionName: "addOwnerWithThreshold",
                args: [eoaSigner?.address, threshold],
            }),
            op: 0,
        });
    }

    return encodeFunctionData({
        abi: MultiSendContractABI,
        functionName: "multiSend",
        args: [encodeMultiSendTransactions(transactions)],
    });
};
