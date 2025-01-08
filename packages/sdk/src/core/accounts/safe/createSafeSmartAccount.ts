import { API } from "@/core/services/API";
import {
    createNewWalletInDb,
    getProjectParamsByChain,
} from "@/core/services/comethService";
import {
    createSigner,
    getSignerAddress,
    saveSigner,
} from "@/core/signers/createSigner";
import type { ComethSignerConfig, Signer } from "@/core/signers/types";
import { getAccountNonce } from "permissionless/actions";
import { toSmartAccount } from "./utils";

import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type PublicClient,
    type Transport,
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

import type { ToSafeSmartAccountReturnType } from "permissionless/accounts";
import { entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
import type { SafeContractParams } from "./types";

export type ComethSafeSmartAccount = ToSafeSmartAccountReturnType<"0.7"> & {
    connectApiInstance: API;
    signerAddress: Address;
    safeContractParams: SafeContractParams;
    comethSignerConfig?: ComethSignerConfig;
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
}>;

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
    singletonAddress,
    safeProxyFactoryAddress,
    saltNonce,
    initializer,
    signer,
    api,
    publicClient,
}: {
    chain: Chain;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce: Hex;
    initializer: Hex;
    signer: Signer;
    api: API;
    publicClient?: PublicClient;
}): Promise<{ smartAccountAddress: Address; isNewWallet: boolean }> => {
    const smartAccountAddress = await getAccountAddress({
        chain,
        singletonAddress,
        safeProxyFactoryAddress,
        saltNonce,
        initializer,
        publicClient,
    });

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
    clientTimeout,
}: createSafeSmartAccountParameters): Promise<ComethSafeSmartAccount> {
    const api = new API(apiKey, baseUrl);
    const [client, contractParams] = await Promise.all([
        getViemClient(chain, publicClient) as Client<
            TTransport,
            TChain,
            undefined
        >,
        getProjectParamsByChain({ api, chain }),
    ]);

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
        throw new Error("Network is not supported");
    }

    const accountSigner = await (signer ??
        createSigner({
            apiKey,
            chain,
            smartAccountAddress,
            ...comethSignerConfig,
            publicClient,
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

    const signerAddress: Address = getSignerAddress(accountSigner);

    const initializer = getSafeInitializer({
        accountSigner,
        threshold: 1,
        fallbackHandler: safe4337Module,
        modules: [safe4337Module],
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress,
        p256Verifier,
        multisendAddress,
    });

    if (!smartAccountAddress) {
        smartAccountAddress = await getAccountAddress({
            chain,
            singletonAddress: safeSingletonAddress,
            safeProxyFactoryAddress,
            saltNonce: zeroHash,
            initializer,
            publicClient,
        });
    }

    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            singletonAddress: safeSingletonAddress,
        });

    const res = await storeWalletInComethApi({
        chain,
        singletonAddress: safeSingletonAddress,
        safeProxyFactoryAddress,
        saltNonce: zeroHash,
        initializer,
        signer: accountSigner,
        api,
        publicClient,
    });

    if (res.isNewWallet) {
        await saveSigner(accountSigner, smartAccountAddress);
    }

    const safeSigner = await comethSignerToSafeSigner<TTransport, TChain>(
        client,
        {
            accountSigner,
            safe4337Module,
            smartAccountAddress,
            fullDomainSelected: comethSignerConfig?.fullDomainSelected ?? false,
        }
    );

    return toSmartAccount({
        client,
        signerAddress,
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

            smartAccountAddress = await getAccountAddress({
                chain,
                singletonAddress: safeSingletonAddress,
                safeProxyFactoryAddress,
                saltNonce: "0" as Hex,
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

        async signUserOperation(parameters) {
            return safeSigner.signUserOperation(parameters);
        },

        async encodeCalls(calls) {
            const hasMultipleCalls = calls.length > 1;

            if (hasMultipleCalls) {
                const userOpCalldata = encodeFunctionData({
                    abi: MultiSendContractABI,
                    functionName: "multiSend",
                    args: [
                        encodeMultiSendTransactions(
                            calls.map((call) => ({
                                op: 0,
                                to: call.to,
                                data: call.data ?? "0x",
                                value: call.value ?? BigInt(0),
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
                args: [calls[0].to, calls[0].value, calls[0].data, 0],
            });
        },

        async getStubSignature() {
            return safeSigner.getStubSignature();
        },
    }) as unknown as ComethSafeSmartAccount;
}
