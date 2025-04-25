import { getSignerAddress, isPasskeySigner } from "@/signers/createPasskeySigner";
import type { PasskeySigner } from "@/signers/types";
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
import { SafeWebAuthnSharedSignerAbi } from "../abi/sharedWebAuthnSigner";
import type { MultiSendTransaction, SafeContractParams } from "../types";
import { API } from "@/services/API";
import { getProjectParamsByChain } from "@/services/comethService";
import type { Signer } from "@/types";


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
    accountSigner,
    setUpContractAddress,
    safeWebAuthnSharedSignerContractAddress,
    safeP256VerifierAddress,
}: {
    modules: Address[];
    accountSigner: PasskeySigner;
    setUpContractAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    safeP256VerifierAddress: Address;
}) => {
    const enableModuleCallData = encodeFunctionData({
        abi: EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    });

    if (isPasskeySigner(accountSigner) && accountSigner.type === "passkey") {
        console.log("before")
        const sharedSignerConfigCallData = encodeFunctionData({
            abi: SafeWebAuthnSharedSignerAbi,
            functionName: "configure",
            args: [
                {
                    x: hexToBigInt(accountSigner.passkey.pubkeyCoordinates.x),
                    y: hexToBigInt(accountSigner.passkey.pubkeyCoordinates.y),
                    verifiers: hexToBigInt(safeP256VerifierAddress),
                },
            ],
        });

        console.log("after")

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

//TODO
/**
 * Generates setup data for enabling modules and configuring the signer
 * @param modules - Array of module addresses to enable
 * @param accountSigner - The signer instance
 * @param setUpContractAddress - Address of the setup contract
 * @param safeWebAuthnSharedSignerContractAddress - Address of the WebAuthn shared signer contract
 * @param safeP256VerifierAddress - Address of the P256 verifier contract
 * @returns Encoded setup data as a Hex string
 */
export const getConfigurePasskeyData = async ({
    accountSigner,
    apiKey,
    chain,
    baseUrl,
}: {
    accountSigner: Signer;
    apiKey: string;
    chain: Chain;
    baseUrl?: string;
}) => {

        const api = new API(apiKey, baseUrl);
        const contractParams = await getProjectParamsByChain({ api, chain })
    
        const {
            safeWebAuthnSharedSignerContractAddress,
            p256Verifier,
        } = 
        //safeContractConfig ??
        (contractParams.safeContractParams as SafeContractParams);

        console.log(
            "safeWebAuthnSharedSignerContractAddress",
            safeWebAuthnSharedSignerContractAddress)

            console.log("before 2")
        const sharedSignerConfigCallData = encodeFunctionData({
            abi: SafeWebAuthnSharedSignerAbi,
            functionName: "configure",
            args: [
                {
                    x: hexToBigInt(accountSigner.publicKeyX!),
                    y: hexToBigInt(accountSigner.publicKeyY!),
                    verifiers: hexToBigInt(p256Verifier),
                },
            ],
        });

        console.log("after 2")

        return ({
                    to: safeWebAuthnSharedSignerContractAddress,
                    data: sharedSignerConfigCallData,
                    value: 0n,
                });
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
    safeWebAuthnSharedSignerContractAddress,
    p256Verifier,
    multisendAddress,
}: {
    accountSigner: PasskeySigner;
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
        accountSigner,
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress:
            safeWebAuthnSharedSignerContractAddress,
        safeP256VerifierAddress: p256Verifier,
    });
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
    accountSigner,
    chain,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    safeModuleSetUpAddress,
    fallbackHandler,
    modules,
    sharedWebAuthnSignerContractAddress,
    p256Verifier,
    multisendAddress,
    publicClient,
}: {
    safeAddress: Address;
    accountSigner: PasskeySigner;
    chain: Chain;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    safeModuleSetUpAddress: Address;
    fallbackHandler: Address;
    modules: Address[];
    sharedWebAuthnSignerContractAddress: Address;
    p256Verifier: Address;
    multisendAddress: Address;
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
            p256Verifier,
            modules,
            multisendAddress,
            threshold: 1,
            sharedWebAuthnSignerContractAddress,
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
    sharedWebAuthnSignerContractAddress,
    p256Verifier,
    multisendAddress,
    threshold = 1,
    publicClient,
}: {
    saltNonce: bigint;
    chain: Chain;
    accountSigner: PasskeySigner;
    safeSingletonAddress: Address;
    safeProxyFactoryAddress: Address;
    fallbackHandler: Address;
    sharedWebAuthnSignerContractAddress: Address;
    setUpContractAddress: Address;
    threshold?: number;
    p256Verifier: Address;
    modules: Address[];
    multisendAddress: Address;
    publicClient?: PublicClient;
}): Promise<Address> => {
    const initializer = getSafeInitializer({
        accountSigner,
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