import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    encodeFunctionData,
    encodePacked,
    getContractAddress,
    hexToBigInt,
    keccak256,
    zeroHash,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";

import {
    createSigner,
    getSignerAddress,
    saveSigner,
} from "@/core/signers/createSigner";

import { LAUNCHPAD_ADDRESS, SAFE_7579_ADDRESS } from "@/constants";
import {
    createNewWalletInDb,
    doesWalletNeedToBeStored,
    getProjectParamsByChain,
} from "@/core/services/comethService";
import type { ComethSignerConfig, Signer } from "@/core/signers/types";
import {
    MOCK_ATTESTER_ADDRESS,
    RHINESTONE_ATTESTER_ADDRESS,
    getSmartSessionsValidator,
} from "@rhinestone/module-sdk";
import { isSmartAccountDeployed } from "permissionless";
import type { ToSafeSmartAccountReturnType } from "permissionless/accounts";
import { getAccountNonce } from "permissionless/actions";
import { entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
import { readContract } from "viem/actions";
import { getViemClient } from "../utils";
import { LaunchpadAbi } from "./abi/7579/Launchpad";
import { toSafeSigner } from "./safeSigner/toSafeSigner";
import type { SafeSigner } from "./safeSigner/types";
import {
    encode7579Calls,
    getSafeInitData,
    getSafeInitializer,
} from "./services/7579";
import type { SafeContractParams } from "./types";
import { toSmartAccount } from "./utils";

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

export type ComethSafeSmartAccount = ToSafeSmartAccountReturnType<"0.7"> & {
    connectApiInstance: API;
    signerAddress: Address;
    rpcUrl?: string;
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
const storeWalletInComethApi = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    client,
    chain,
    erc7579LaunchpadAddress,
    safeProxyFactoryAddress,
    initializer,
    signer,
    api,
    saltNonce,
}: {
    client: Client<TTransport, TChain>;
    chain: Chain;
    safeProxyFactoryAddress: Address;
    erc7579LaunchpadAddress: Address;
    initializer: Hex;
    signer: Signer;
    api: API;
    saltNonce: bigint;
}): Promise<Address> => {
    const smartAccountAddress = await getAccountAddress({
        client,
        safeProxyFactoryAddress,
        erc7579LaunchpadAddress,
        saltNonce,
        initializer,
    });

    await createNewWalletInDb({
        chain,
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

export type createSafeSmartAccountParameters = Prettify<{
    apiKey: string;
    chain: Chain;
    rpcUrl?: string;
    baseUrl?: string;
    smartAccountAddress?: Address;
    comethSignerConfig?: ComethSignerConfig;
    safeContractConfig?: SafeContractParams;
    signer?: Signer;
    smartSessionSigner?: SafeSigner;
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
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKey,
    chain,
    rpcUrl,
    baseUrl,
    smartAccountAddress,
    comethSignerConfig,
    safeContractConfig,
    signer,
    smartSessionSigner,
}: createSafeSmartAccountParameters): Promise<ComethSafeSmartAccount> {
    const smartSessions = getSmartSessionsValidator({});

    const validators = [
        {
            address: smartSessions.address,
            context: smartSessions.initData,
        },
    ];
    const attesters = [RHINESTONE_ATTESTER_ADDRESS, MOCK_ATTESTER_ADDRESS];
    const attestersThreshold = 1;

    const api = new API(apiKey, baseUrl);

    const client = (await getViemClient(chain, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    const {
        safeWebAuthnSharedSignerContractAddress,
        setUpContractAddress,
        p256Verifier,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
        safe4337ModuleAddress,
        safeWebAuthnSignerFactory,
    } =
        safeContractConfig ??
        (await getProjectParamsByChain({ api, chain })).safeContractParams;

    const accountSigner =
        signer ??
        (await createSigner({
            apiKey,
            chain,
            smartAccountAddress,
            ...comethSignerConfig,
            rpcUrl,
            baseUrl,
            safeContractParams: {
                safeWebAuthnSharedSignerContractAddress,
                setUpContractAddress,
                p256Verifier,
                safeProxyFactoryAddress,
                safeSingletonAddress,
                multisendAddress,
                fallbackHandler: safe4337ModuleAddress as Address,
                safeWebAuthnSignerFactory,
            },
        }));

    const signerAddress = getSignerAddress(accountSigner);

    const initializer = await getSafeInitializer({
        accountSigner,
        safeP256VerifierAddress: p256Verifier,
        owner: signerAddress,
        safeSingletonAddress: safeSingletonAddress,
        erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
        safe7579Address: SAFE_7579_ADDRESS,
        attesters,
        attestersThreshold,
        validators,
    });

    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
        });

    const walletNeedsToBeStored = await doesWalletNeedToBeStored({
        smartAccountAddress,
        chainId: chain.id,
        api,
    });

    if (walletNeedsToBeStored) {
        smartAccountAddress = await storeWalletInComethApi({
            client,
            chain: client.chain as Chain,
            erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
            safeProxyFactoryAddress,
            saltNonce: BigInt(0),
            initializer,
            signer: accountSigner,
            api,
        });

        await saveSigner(chain, api, accountSigner, smartAccountAddress);
    }

    if (!smartAccountAddress) throw new Error("Account address not found");

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    const safeSigner =
        smartSessionSigner ??
        (await toSafeSigner<TTransport, TChain>(client, {
            accountSigner,
            safe4337ModuleAddress: SAFE_7579_ADDRESS,
            smartAccountAddress,
            erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
            fullDomainSelected: comethSignerConfig?.fullDomainSelected ?? false,
        }));

    return toSmartAccount({
        client,
        signerAddress,
        entryPoint: {
            abi: entryPoint07Abi,
            address: entryPoint07Address,
            version: "0.7",
        },
        connectApiInstance: api,
        rpcUrl,
        async signMessage({ message }) {
            return safeSigner.signMessage({ message });
        },
        async signTypedData() {
            throw new Error("method not supported");
        },

        async getFactoryArgs() {
            return {
                factory: safeProxyFactoryAddress as Address,
                factoryData: await generateInitCode(),
            };
        },

        async getAddress() {
            if (smartAccountAddress) return smartAccountAddress;

            // Get the sender address based on the init code
            smartAccountAddress = await getAccountAddress({
                client,
                safeProxyFactoryAddress,
                erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
                saltNonce: 0n,
                initializer,
            });

            return smartAccountAddress;
        },

        async getNonce() {
            return getAccountNonce(client, {
                address: smartAccountAddress as Address,
                entryPointAddress: entryPoint07Address,
            });
        },

        async encodeCalls(calls) {
            const hasMultipleCalls = calls.length > 1;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress as Address
            );

            if (!smartAccountDeployed) {
                const initData = getSafeInitData({
                    validators,
                    executors: [],
                    fallbacks: [],
                    hooks: [],
                    attesters,
                    attestersThreshold,
                    owner: signerAddress,
                    safeSingletonAddress: safeSingletonAddress,
                    erc7579LaunchpadAddress: LAUNCHPAD_ADDRESS,
                    safe4337ModuleAddress: SAFE_7579_ADDRESS,
                });

                return encodeFunctionData({
                    abi: LaunchpadAbi,
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
                            callData: encode7579Calls({
                                mode: {
                                    type: hasMultipleCalls
                                        ? "batchcall"
                                        : "call",
                                    revertOnError: false,
                                    selector: "0x",
                                    context: "0x",
                                },
                                callData: calls,
                            }),
                        },
                    ],
                });
            }

            return encode7579Calls({
                mode: {
                    type: hasMultipleCalls ? "batchcall" : "call",
                    revertOnError: false,
                    selector: "0x",
                    context: "0x",
                },
                callData: calls,
            });
        },

        async signUserOperation(parameters) {
            return safeSigner.signUserOperation(parameters);
        },

        async getStubSignature() {
            return safeSigner.getStubSignature();
        },
    }) as unknown as ComethSafeSmartAccount;
}
