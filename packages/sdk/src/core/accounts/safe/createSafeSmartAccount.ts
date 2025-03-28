import { API } from "@/core/services/API";
import {
    createNewWalletInDb,
    getProjectParamsByChain,
    getWalletByChainId,
} from "@/core/services/comethService";
import { createSigner, saveSigner } from "@/core/signers/createSigner";
import type { ComethSignerConfig, Signer } from "@/core/signers/types";
import { getAccountNonce } from "permissionless/actions";
import { toSmartAccount } from "./utils";

import {
    http,
    type Address,
    type Chain,
    ChainNotFoundError,
    type Hex,
    type PublicClient,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    hexToBigInt,
    zeroHash,
} from "viem";
import type { Prettify } from "viem/types/utils";
import { getViemClient } from "../utils";
import { MultiSendContractABI } from "./abi/Multisend";
import { safe4337ModuleAbi } from "./abi/safe4337ModuleAbi";
import { SafeProxyContractFactoryABI } from "./abi/safeProxyFactory";
import { comethSignerToSafeSigner } from "./safeSigner/comethSignerToSafeSigner";
import {
    encodeMultiSendTransactions,
    getSafeAddressFromInitializer,
    getSafeInitializer,
} from "./services/safe";

import { SAFE_7579_ADDRESS, add7579FunctionSelector } from "@/constants";
import { MethodNotSupportedError } from "@/errors";
import {
    SessionKeyModeError,
    WalletNotStoredForSessionKeyModeError,
} from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import type { ToSafeSmartAccountReturnType } from "permissionless/accounts";
import { entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
import { SafeAbi } from "./abi/safe";
import type { SafeSigner } from "./safeSigner/types";
import { encode7579Calls } from "./services/7579";
import type { SafeContractParams } from "./types";

export type ComethSafeSmartAccount = ToSafeSmartAccountReturnType<"0.7"> & {
    connectApiInstance: API;
    signerAddress: Address;
    safeContractParams: SafeContractParams;
    comethSignerConfig?: ComethSignerConfig;
    publicClient?: PublicClient;
};

export type createSafeSmartAccountParameters = Prettify<{
    apiKey: string;
    chain: Chain;
    publicClient?: PublicClient;
    baseUrl?: string;
    smartAccountAddress?: Address;
    comethSignerConfig?: ComethSignerConfig;
    safeContractConfig?: SafeContractParams;
    signer?: Signer;
    smartSessionSigner?: SafeSigner;
}>;

const initConfig = async ({
    apiKey,
    baseUrl,
    chain,
    publicClient,
}: {
    apiKey: string;
    baseUrl?: string;
    chain: Chain;
    publicClient?: PublicClient;
}) => {
    const api = new API(apiKey, baseUrl);
    const [client, contractParams] = await Promise.all([
        // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        getViemClient(chain, publicClient) as any,
        getProjectParamsByChain({ api, chain }),
    ]);

    publicClient =
        publicClient ??
        (createPublicClient({
            chain: chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as PublicClient);

    return { api, client, contractParams, publicClient };
};

// Check if 7579 module is enabled
const check7579ModuleStatus = async ({
    isDeployed,
    publicClient,
    smartAccountAddress,
}: {
    isDeployed: boolean;
    publicClient: PublicClient;
    smartAccountAddress: Address;
}): Promise<boolean> => {
    if (!isDeployed) {
        return false;
    }

    const is7579Enabled = await publicClient.readContract({
        address: smartAccountAddress,
        abi: SafeAbi,
        functionName: "isModuleEnabled",
        args: [SAFE_7579_ADDRESS as Address],
    });

    return is7579Enabled as boolean;
};

/**
 * Get the account initialization code for a Safe smart account
 */
const getAccountInitCode = async ({
    initializer,
    singletonAddress,
    saltNonce = zeroHash,
}: {
    initializer: Hex;
    singletonAddress: Address;
    saltNonce?: Hex;
}): Promise<Hex> => {
    return encodeFunctionData({
        abi: SafeProxyContractFactoryABI,
        functionName: "createProxyWithNonce",
        args: [singletonAddress, initializer, hexToBigInt(saltNonce)],
    });
};

/**
 * Store wallet in Cometh API and return the smart account address
 */
const storeWalletInComethApi = async ({
    chain,
    signer,
    api,
    smartAccountAddress,
}: {
    chain: Chain;
    signer: Signer;
    api: API;
    smartAccountAddress: Address;
}): Promise<{ smartAccountAddress: Address; isNewWallet: boolean }> => {
    const isNewWallet = await createNewWalletInDb({
        chain,
        api,
        smartAccountAddress,
        signer,
    });

    return { smartAccountAddress, isNewWallet };
};

/**
 * Get the predicted account address for a Safe smart account
 */
export const getAccountAddress = async ({
    chain,
    singletonAddress,
    safeProxyFactoryAddress,
    saltNonce = zeroHash,
    initializer,
    publicClient,
}: {
    chain: Chain;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce?: Hex;
    initializer: Hex;
    publicClient?: PublicClient;
}): Promise<Address> => {
    return getSafeAddressFromInitializer({
        chain,
        initializer,
        saltNonce: hexToBigInt(saltNonce),
        safeProxyFactoryAddress,
        safeSingletonAddress: singletonAddress,
        publicClient,
    });
};

/**
 * Create a Safe smart account
 */
export async function createSafeSmartAccount<
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKey,
    chain,
    publicClient,
    baseUrl,
    smartAccountAddress,
    comethSignerConfig,
    safeContractConfig,
    signer,
    smartSessionSigner,
}: createSafeSmartAccountParameters): Promise<ComethSafeSmartAccount> {
    const {
        api,
        client,
        contractParams,
        publicClient: publicClient_,
    } = await initConfig({ apiKey, baseUrl, chain, publicClient });

    const {
        safeWebAuthnSharedSignerContractAddress,
        setUpContractAddress,
        p256Verifier,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
        safe4337ModuleAddress: safe4337Module,
        safeWebAuthnSignerFactory,
    } = safeContractConfig ??
    (contractParams.safeContractParams as SafeContractParams);

    if (!safe4337Module) {
        throw new ChainNotFoundError();
    }

    if (smartSessionSigner && !smartAccountAddress) {
        throw new SessionKeyModeError();
    }

    let accountSigner: Signer | undefined = undefined;
    let initializer: Hex | undefined = undefined;

    if (!smartSessionSigner) {
        accountSigner = await (signer ??
            createSigner({
                apiKey,
                chain,
                smartAccountAddress,
                ...comethSignerConfig,
                publicClient: publicClient_,
                baseUrl,
                safeContractParams: {
                    safeWebAuthnSharedSignerContractAddress,
                    setUpContractAddress,
                    p256Verifier,
                    safeProxyFactoryAddress,
                    safeSingletonAddress,
                    multisendAddress,
                    fallbackHandler: safe4337Module,
                    safeWebAuthnSignerFactory,
                },
            }));

        initializer = getSafeInitializer({
            accountSigner,
            threshold: 1,
            fallbackHandler: safe4337Module,
            modules: [safe4337Module],
            setUpContractAddress,
            safeWebAuthnSharedSignerContractAddress,
            p256Verifier,
            multisendAddress,
        });
    }

    if (!smartAccountAddress) {
        if (!initializer) throw new Error("Initializer is required");

        smartAccountAddress = await getAccountAddress({
            chain,
            singletonAddress: safeSingletonAddress,
            safeProxyFactoryAddress,
            saltNonce: zeroHash,
            initializer,
            publicClient: publicClient_,
        });
    }

    // cometh authentifaction
    if (smartSessionSigner) {
        const savedAccount = await getWalletByChainId({
            smartAccountAddress,
            chainId: chain.id,
            api,
        });
        if (!savedAccount) throw new WalletNotStoredForSessionKeyModeError();
    } else {
        const res = await storeWalletInComethApi({
            chain,
            signer: accountSigner as Signer,
            api,
            smartAccountAddress,
        });

        if (res.isNewWallet)
            await saveSigner(accountSigner as Signer, smartAccountAddress);
    }

    const isDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    const is7579Enabled = await check7579ModuleStatus({
        isDeployed,
        publicClient: publicClient_,
        smartAccountAddress,
    });

    const userOpVerifyingContract = is7579Enabled
        ? SAFE_7579_ADDRESS
        : safe4337Module;

    const safeSigner =
        smartSessionSigner ??
        (await comethSignerToSafeSigner<TTransport, TChain>(client, {
            accountSigner: accountSigner as Signer,
            userOpVerifyingContract,
            smartAccountAddress,
            fullDomainSelected: comethSignerConfig?.fullDomainSelected ?? false,
        }));

    return toSmartAccount({
        client,
        entryPoint: {
            abi: entryPoint07Abi,
            address: entryPoint07Address,
            version: "0.7",
        },
        connectApiInstance: api,
        safeContractParams:
            safeContractConfig ??
            (contractParams.safeContractParams as SafeContractParams),
        comethSignerConfig: comethSignerConfig,
        publicClient: publicClient_,
        async signMessage({ message }) {
            return safeSigner.signMessage({ message });
        },

        async signTypedData() {
            throw new MethodNotSupportedError();
        },

        async getFactoryArgs() {
            if (!initializer) throw new Error("Initializer is required");

            return {
                factory: safeProxyFactoryAddress as Address,
                factoryData: await getAccountInitCode({
                    initializer,
                    singletonAddress: safeSingletonAddress,
                }),
            };
        },

        async getAddress() {
            return smartAccountAddress;
        },

        async getNonce(args) {
            return getAccountNonce(client, {
                address: smartAccountAddress as Address,
                entryPointAddress: entryPoint07Address,
                key: args?.key
            });
        },

        async signUserOperation(parameters) {
            return safeSigner.signUserOperation(parameters);
        },

        async encodeCalls(calls) {
            const hasMultipleCalls = calls.length > 1;

            if (userOpVerifyingContract === SAFE_7579_ADDRESS) {
                return encode7579Calls({
                    mode: {
                        type: hasMultipleCalls ? "batchcall" : "call",
                        revertOnError: false,
                        selector: "0x",
                        context: "0x",
                    },
                    callData: calls,
                });
            }

            // set fallback 7579 in delegateCall
            const modifiedCalls = calls.map((call) => ({
                ...call,
                data: call.data ?? "0x",
                value: call.value ?? BigInt(0),
                operation:
                    call.data?.slice(0, 10) === add7579FunctionSelector ? 1 : 0,
            }));

            if (hasMultipleCalls) {
                const userOpCalldata = encodeFunctionData({
                    abi: MultiSendContractABI,
                    functionName: "multiSend",
                    args: [
                        encodeMultiSendTransactions(
                            modifiedCalls.map((call) => ({
                                op: call.operation,
                                to: call.to,
                                data: call.data,
                                value: call.value,
                            }))
                        ) as `0x${string}`,
                    ],
                });

                return encodeFunctionData({
                    abi: safe4337ModuleAbi,
                    functionName: "executeUserOpWithErrorString",
                    args: [multisendAddress, BigInt(0), userOpCalldata, 1],
                });
            }

            return encodeFunctionData({
                abi: safe4337ModuleAbi,
                functionName: "executeUserOpWithErrorString",
                args: [
                    modifiedCalls[0].to,
                    modifiedCalls[0].value,
                    modifiedCalls[0].data,
                    modifiedCalls[0].operation,
                ],
            });
        },

        async getStubSignature() {
            return safeSigner.getStubSignature();
        },
    }) as unknown as ComethSafeSmartAccount;
}
