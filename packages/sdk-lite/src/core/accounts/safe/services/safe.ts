import { getSignerAddress } from "@/core/signers/createSigner";
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
