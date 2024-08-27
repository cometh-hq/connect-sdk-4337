import { getAccountNonce, isSmartAccountDeployed } from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";

import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint";
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concatHex,
    encodeFunctionData,
    encodePacked,
    getContractAddress,
    hexToBigInt,
    keccak256,
    zeroHash,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";
import { getClient } from "../utils";

import { createSigner, saveSigner } from "@/core/signers/createSigner";
import type { ComethSigner, SignerConfig } from "@/core/signers/types";

import { LAUNCHPAD_ADDRESS, SAFE_7579_ADDRESS } from "@/constants";
import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "@/core/services/comethService";
import type { EntryPoint } from "permissionless/_types/types";
import { readContract } from "viem/actions";
import { Launchpad } from "./abi/7579/Launchpad";
import { comethSignerToSafeSigner } from "./safeSigner/comethSignerToSafeSigner";
import {
    encode7579CallData,
    getSafeInitData,
    getSafeInitializer,
} from "./services/7579";
import type { ProjectParams, SafeContractParams } from "./types";
import { toSmartAccount } from "./utils";

export const initSafe7579Abi = [
    {
        type: "function",
        name: "initSafe7579",
        inputs: [
            {
                name: "safe7579",
                type: "address",
                internalType: "address",
            },
            {
                name: "executors",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "initData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
            {
                name: "fallbacks",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "initData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
            {
                name: "hooks",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "initData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
            {
                name: "attesters",
                type: "address[]",
                internalType: "address[]",
            },
            {
                name: "threshold",
                type: "uint8",
                internalType: "uint8",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
] as const;

export const preValidationSetupAbi = [
    {
        type: "function",
        name: "preValidationSetup",
        inputs: [
            {
                name: "initHash",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "to",
                type: "address",
                internalType: "address",
            },
            {
                name: "preInit",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
] as const;

export const setupSafeAbi = [
    {
        type: "function",
        name: "setupSafe",
        inputs: [
            {
                name: "initData",
                type: "tuple",
                internalType: "struct Safe7579Launchpad.InitData",
                components: [
                    {
                        name: "singleton",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "owners",
                        type: "address[]",
                        internalType: "address[]",
                    },
                    {
                        name: "threshold",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "setupTo",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "setupData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    {
                        name: "safe7579",
                        type: "address",
                        internalType: "contract ISafe7579",
                    },
                    {
                        name: "validators",
                        type: "tuple[]",
                        internalType: "struct ModuleInit[]",
                        components: [
                            {
                                name: "module",
                                type: "address",
                                internalType: "address",
                            },
                            {
                                name: "initData",
                                type: "bytes",
                                internalType: "bytes",
                            },
                        ],
                    },
                    {
                        name: "callData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
] as const;

export const createProxyWithNonceAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_singleton",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "initializer",
                type: "bytes",
            },
            {
                internalType: "uint256",
                name: "saltNonce",
                type: "uint256",
            },
        ],
        name: "createProxyWithNonce",
        outputs: [
            {
                internalType: "contract SafeProxy",
                name: "proxy",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

export const proxyCreationCodeAbi = [
    {
        inputs: [],
        name: "proxyCreationCode",
        outputs: [
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
] as const;

export type SafeSmartAccount<
    entryPoint extends EntryPoint,
    TSource extends string,
    transport extends Transport,
    chain extends Chain | undefined,
> = SmartAccount<entryPoint, TSource, transport, chain> & {
    getConnectApi(): API;
    safe4337SessionKeysModule: Address;
    signerAddress: Address;
};

/**
 * Get the account initialization code for a Safe smart account
 * @param initializer - The initializer data for the Safe
 * @param singletonAddress - The address of the Safe singleton contract
 * @param safeFactoryAddress - The address of the Safe proxy factory
 * @param saltNonce - Optional salt nonce for CREATE2 deployment (defaults to zeroHash)
 * @returns The packed initialization code
 */
const getAccountInitCode = async ({
    initializer,
    erc7579LaunchpadAddress,
    saltNonce = zeroHash,
}: {
    initializer: Hex;
    erc7579LaunchpadAddress: Address;
    saltNonce?: Hex;
}) => {
    const createProxyWithNonceAbi = [
        {
            inputs: [
                {
                    internalType: "address",
                    name: "_singleton",
                    type: "address",
                },
                {
                    internalType: "bytes",
                    name: "initializer",
                    type: "bytes",
                },
                {
                    internalType: "uint256",
                    name: "saltNonce",
                    type: "uint256",
                },
            ],
            name: "createProxyWithNonce",
            outputs: [
                {
                    internalType: "contract SafeProxy",
                    name: "proxy",
                    type: "address",
                },
            ],
            stateMutability: "nonpayable",
            type: "function",
        },
    ] as const;

    return encodeFunctionData({
        abi: createProxyWithNonceAbi,
        functionName: "createProxyWithNonce",
        args: [erc7579LaunchpadAddress, initializer, BigInt(saltNonce)],
    });
};

/**
 * Authenticate the wallet to the cometh api
 * @param singletonAddress - The address of the Safe singleton contract
 * @param safeProxyFactoryAddress - The address of the Safe proxy factory
 * @param saltNonce - Optional salt nonce for CREATE2 deployment (defaults to zeroHash)
 * @param initializer - The initializer data for the Safe
 * @param signer
 * @param api
 */
const authenticateToComethApi = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    client,
    safeProxyFactoryAddress,
    erc7579LaunchpadAddress,
    saltNonce,
    initializer,
    signer,
    api,
}: {
    client: Client<TTransport, TChain>;
    safeProxyFactoryAddress: Address;
    erc7579LaunchpadAddress: Address;
    saltNonce: bigint;
    initializer: Hex;
    signer: ComethSigner;
    api: API;
}): Promise<Address> => {
    const smartAccountAddress = await getAccountAddress({
        client,
        safeProxyFactoryAddress,
        erc7579LaunchpadAddress,
        saltNonce,
        initializer,
    });

    await createNewWalletInDb({
        api,
        smartAccountAddress,
        signer,
    });

    return smartAccountAddress;
};

/**
 * Predict the account address for a Safe smart account
 * @param singletonAddress - The address of the Safe singleton contract
 * @param safeProxyFactoryAddress - The address of the Safe proxy factory
 * @param saltNonce - Optional salt nonce for CREATE2 deployment (defaults to zeroHash)
 * @param initializer - The initializer data for the Safe
 * @returns The predicted account address
 */
export const getAccountAddress = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    client,
    safeProxyFactoryAddress,
    erc7579LaunchpadAddress,
    saltNonce = BigInt(0),
    initializer,
}: {
    client: Client<TTransport, TChain>;
    safeProxyFactoryAddress: Address;
    erc7579LaunchpadAddress: Address;
    saltNonce?: bigint;
    initializer: Hex;
}) => {
    const safeProxyCreationCode = await readContract(client, {
        abi: proxyCreationCodeAbi,
        address: safeProxyFactoryAddress,
        functionName: "proxyCreationCode",
    });

    const deploymentCode = encodePacked(
        ["bytes", "uint256"],
        [safeProxyCreationCode, hexToBigInt(erc7579LaunchpadAddress)]
    );

    const salt = keccak256(
        encodePacked(
            ["bytes32", "uint256"],
            [keccak256(encodePacked(["bytes"], [initializer])), saltNonce]
        )
    );

    return getContractAddress({
        from: safeProxyFactoryAddress,
        salt,
        bytecode: deploymentCode,
        opcode: "CREATE2",
    });
};

export type createSafeSmartAccountParameters<
    TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE,
> = Prettify<{
    apiKey: string;
    rpcUrl?: string;
    baseUrl?: string;
    smartAccountAddress?: Address;
    entryPoint: TEntryPoint;
    comethSignerConfig?: SignerConfig;
    safeContractConfig?: SafeContractParams;
    comethSigner?: any;
}>;

/**
 * Create a Safe smart account
 * @param apiKey - The API key for authentication
 * @param rpcUrl - Optional RPC URL for the blockchain network
 * @param baseUrl - Optional base URL for the API
 * @param smartAccountAddress - Optional address of an existing smart account
 * @param entryPoint - The entry point contract address
 * @param comethSignerConfig - Optional configuration for the Cometh signer
 * @param safeContractConfig - Optional configuration for the Safe contract
 * @returns A SafeSmartAccount instance
 */
export async function createSafeSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKey,
    rpcUrl,
    baseUrl,
    smartAccountAddress,
    entryPoint: entryPointAddress,
    comethSignerConfig,
    safeContractConfig,
    comethSigner,
}: createSafeSmartAccountParameters<entryPoint>): Promise<
    SafeSmartAccount<entryPoint, string, TTransport, TChain>
> {
    const api = new API(apiKey, baseUrl);

    if (smartAccountAddress) {
        await connectToExistingWallet({
            api,
            smartAccountAddress,
        });
    }

    const {
        safeWebAuthnSharedSignerContractAddress,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        safe4337SessionKeysModule,
    } =
        safeContractConfig ??
        ((await api.getProjectParams()) as ProjectParams).safeContractParams;

    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    if (!comethSigner) {
        comethSigner = await createSigner({
            apiKey,
            baseUrl,
            smartAccountAddress,
            safeWebAuthnSharedSignerAddress:
                safeWebAuthnSharedSignerContractAddress,
            ...comethSignerConfig,
        });
    }

    const signerAddress =
        comethSigner.type === "localWallet"
            ? comethSigner.eoaFallback.signer.address
            : comethSigner.passkey.signerAddress;

    const initializer = await getSafeInitializer({
        owner: comethSigner.eoaFallback.signer.address,
        safeSingletonAddress: safeSingletonAddress,
        erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
        safe7579Address: SAFE_7579_ADDRESS,
    });

    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
        });

    if (!smartAccountAddress) {
        smartAccountAddress = await authenticateToComethApi({
            client,
            safeProxyFactoryAddress,
            erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
            saltNonce: BigInt(0),
            initializer,
            signer: comethSigner,
            api,
        });

        await saveSigner(api, comethSigner, smartAccountAddress);
    }

    if (!smartAccountAddress) throw new Error("Account address not found");

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    const safeSigner = await comethSignerToSafeSigner<TTransport, TChain>(
        client,
        {
            comethSigner,
            safe4337ModuleAddress: SAFE_7579_ADDRESS,
            smartAccountAddress,
            erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
        }
    );

    const smartAccount = toSmartAccount({
        address: smartAccountAddress,
        async signMessage({ message }) {
            return safeSigner.signMessage({ message });
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async signTypedData() {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        client: client,
        entryPoint: entryPointAddress,
        source: "safeSmartAccount",

        async getNonce() {
            return getAccountNonce(client, {
                sender: smartAccountAddress,
                entryPoint: entryPointAddress,
            });
        },

        async signUserOperation(userOp) {
            console.log({ userOp });
            return safeSigner.signUserOperation(userOp);
        },

        // Encode the init code
        async getInitCode() {
            if (smartAccountDeployed) return "0x";

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (smartAccountDeployed) return "0x";

            return concatHex([
                (await this.getFactory()) ?? "0x",
                (await this.getFactoryData()) ?? "0x",
            ]);
        },

        async getFactory() {
            if (smartAccountDeployed) return undefined;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (smartAccountDeployed) return undefined;

            return safeProxyFactoryAddress;
        },

        async getFactoryData() {
            if (smartAccountDeployed) return undefined;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (smartAccountDeployed) return undefined;

            return await generateInitCode();
        },

        // Encode the deploy call data
        async encodeDeployCallData(_) {
            throw new Error("Safe account doesn't support account deployment");
        },

        // Encode a call
        async encodeCallData(_tx) {
            const isArray = Array.isArray(_tx);

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (!smartAccountDeployed) {
                const initData = getSafeInitData({
                    validators: [],
                    executors: [],
                    fallbacks: [],
                    hooks: [],
                    attesters: [],
                    attestersThreshold: 0,
                    owner: comethSigner.eoaFallback.signer.address,
                    safeSingletonAddress: safeSingletonAddress,
                    erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
                    safe4337ModuleAddress: SAFE_7579_ADDRESS,
                });

                return encodeFunctionData({
                    abi: Launchpad,
                    functionName: "setupSafe",
                    args: [
                        {
                            ...initData,
                            validators: initData.validators.map(
                                (validator) => ({
                                    module: validator.address,
                                    initData: validator.context,
                                })
                            ),
                            callData: encode7579CallData({
                                mode: {
                                    type: isArray ? "batchcall" : "call",
                                    revertOnError: false,
                                    selector: "0x",
                                    context: "0x",
                                },
                                callData: _tx,
                            }),
                        },
                    ],
                });
            }

            return encode7579CallData({
                mode: {
                    type: isArray ? "batchcall" : "call",
                    revertOnError: false,
                    selector: "0x",
                    context: "0x",
                },
                callData: _tx,
            });
        },

        async getDummySignature(userOp) {
            return safeSigner.getDummySignature(userOp);
        },
    });

    return {
        ...smartAccount,
        signerAddress,
        safe4337SessionKeysModule: safe4337SessionKeysModule as Address,
        getConnectApi(): API {
            return api;
        },
    };
}
