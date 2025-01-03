import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { SafeProxyContractFactoryABI } from "@/core/accounts/safe/abi/safeProxyFactory";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    createPublicClient,
    encodeFunctionData,
    getContract,
    hexToBigInt,
    keccak256,
    stringToHex,
    zeroAddress,
} from "viem";
import { SafeLegacyAbi } from "../abi/safeLegacy";
import type { LEGACY_API } from "./LEGACY_API";

export const WEBAUTHN_DEFAULT_BASE_GAS = 300000;

export const isSafeOwner = async ({
    safeAddress,
    signerAddress,
    chain,
    rpcUrl,
}: {
    safeAddress: Address;
    signerAddress: Address;
    chain: Chain;
    rpcUrl?: string;
}): Promise<boolean> => {
    const publicClient = createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
    });

    const safe = getContract({
        address: safeAddress,
        abi: SafeLegacyAbi,
        client: publicClient,
    });

    const isDeployed = await isSmartAccountDeployed(publicClient, safeAddress);

    if (!isDeployed) throw new Error("Safe not deployed");

    return (await safe.read.isOwner([signerAddress])) as boolean;
};

export const isSigner = async (
    signerAddress: Address,
    walletAddress: Address,
    chain: Chain,
    API: LEGACY_API
): Promise<boolean> => {
    try {
        const owner = await isSafeOwner({
            safeAddress: walletAddress,
            chain,
            signerAddress,
        });

        if (!owner) return false;
    } catch {
        const predictedWalletAddress =
            await API.getWalletAddress(signerAddress);

        if (predictedWalletAddress !== walletAddress) return false;
    }

    return true;
};

export const getLegacySafeDeploymentData = ({
    ownerAddress,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    deploymentManagerAddress,
    fallbackHandler,
    guardianId,
    legacyP256FactoryAddress,
    passkey,
}: {
    ownerAddress: Address;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    deploymentManagerAddress: Address;
    fallbackHandler: Address;
    guardianId: string;
    legacyP256FactoryAddress: Address;
    passkey?: PasskeyLocalStorageFormat;
}) => {
    const txs = [];

    let enableModulesData: string;

    const zeroHash =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

    const comethSalt = hexToBigInt(stringToHex("COMETH-AA", { size: 32 }));

    if (!guardianId) {
        enableModulesData = zeroHash;
    } else {
        enableModulesData = encodeFunctionData({
            abi: [
                {
                    inputs: [
                        {
                            internalType: "contract DeploymentManager",
                            name: "manager",
                            type: "address",
                        },
                        {
                            internalType: "bytes32",
                            name: "guardianId",
                            type: "bytes32",
                        },
                    ],
                    name: "setupModules",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function",
                },
            ],
            functionName: "setupModules",
            args: [
                deploymentManagerAddress,
                keccak256(Buffer.from(guardianId)),
            ],
        });
    }

    const setUpData = encodeFunctionData({
        abi: SafeAbi,
        functionName: "setup",
        args: [
            [ownerAddress],
            1,
            deploymentManagerAddress,
            enableModulesData,
            fallbackHandler,
            zeroAddress,
            0,
            zeroAddress,
        ],
    });

    txs.push({
        to: safeProxyFactoryAddress,
        data: encodeFunctionData({
            abi: SafeProxyContractFactoryABI,
            functionName: "createProxyWithNonce",
            args: [safeSingletonAddress, setUpData, comethSalt],
        }),
        value: 0,
        op: 0,
    });

    if (passkey) {
        txs.push({
            to: legacyP256FactoryAddress,
            data: encodeFunctionData({
                abi: [
                    {
                        inputs: [
                            {
                                internalType: "uint256",
                                name: "x",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "y",
                                type: "uint256",
                            },
                        ],
                        name: "create",
                        outputs: [
                            {
                                internalType: "address",
                                name: "",
                                type: "address",
                            },
                        ],
                        stateMutability: "nonpayable",
                        type: "function",
                    },
                ],
                functionName: "create",
                args: [
                    BigInt(passkey.pubkeyCoordinates.x),
                    BigInt(passkey.pubkeyCoordinates.y),
                ],
            }),
            value: 0,
            op: 0,
        });
    }

    return txs;
};
