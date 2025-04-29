import type { Signer } from "@/core/signers/types";
import { getAccountNonce } from "permissionless/actions";
import { toSmartAccount } from "./utils";

import {
    http,
    type Address,
    type Chain,
    ChainNotFoundError,
    type Client,
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
import { safeECDSASigner } from "./safeSigner/ecdsa/ecdsa.js";
import {
    encodeMultiSendTransactions,
    getSafeAddressFromInitializer,
    getSafeInitializer,
} from "./services/safe";

import {
    SAFE_7579_ADDRESS,
    add7579FunctionSelector,
    defaultSafeContractConfig,
} from "@/constants";
import { MethodNotSupportedError } from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import type { ToSafeSmartAccountReturnType } from "permissionless/accounts";
import { entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
import { SafeAbi } from "./abi/safe";
import { encode7579Calls } from "./services/7579";
import type { MultiSendTransaction, SafeContractParams } from "./types";

export type ComethSafeSmartAccount = ToSafeSmartAccountReturnType<"0.7"> & {
    signerAddress: Address;
    safeContractParams: SafeContractParams;
    publicClient?: PublicClient;
};

export type createSafeSmartAccountParameters = Prettify<{
    chain: Chain;
    signer: Signer;
    safeContractConfig?: SafeContractParams;
    publicClient?: PublicClient;
    smartAccountAddress?: Address;
    setupTransactions?: MultiSendTransaction[];
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
    chain,
    publicClient,
    smartAccountAddress,
    safeContractConfig,
    signer,
    setupTransactions,
}: createSafeSmartAccountParameters): Promise<ComethSafeSmartAccount> {
    const client = (await getViemClient(chain, publicClient)) as Client<
        TTransport,
        TChain,
        undefined
    >;

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

    const {
        setUpContractAddress,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
        safe4337ModuleAddress: safe4337Module,
    } = safeContractConfig ?? (defaultSafeContractConfig as SafeContractParams);

    if (!safe4337Module) {
        throw new ChainNotFoundError();
    }

    const initializer = getSafeInitializer({
        accountSigner: signer,
        threshold: 1,
        fallbackHandler: safe4337Module,
        modules: [safe4337Module],
        setUpContractAddress,
        multisendAddress,
        setupTransactions,
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

    let userOpVerifyingContract = safe4337Module;

    const isDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    if (isDeployed) {
        const is7579Enabled = await publicClient.readContract({
            address: smartAccountAddress,
            abi: SafeAbi,
            functionName: "isModuleEnabled",
            args: [SAFE_7579_ADDRESS as Address],
        });

        if (is7579Enabled) {
            userOpVerifyingContract = SAFE_7579_ADDRESS;
        }
    }

    const safeSigner = await safeECDSASigner<TTransport, TChain>(client, {
        signer,
        smartAccountAddress,
        userOpVerifyingContract,
    });

    return toSmartAccount({
        client,
        signerAddress: signer.address,
        entryPoint: {
            abi: entryPoint07Abi,
            address: entryPoint07Address,
            version: "0.7",
        },
        safeContractParams:
            safeContractConfig ??
            (defaultSafeContractConfig as SafeContractParams),
        publicClient,
        async signMessage({ message }) {
            return safeSigner.signMessage({ message });
        },

        async signTypedData() {
            throw new MethodNotSupportedError();
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

        async getNonce(args) {
            return getAccountNonce(client, {
                address: smartAccountAddress as Address,
                entryPointAddress: entryPoint07Address,
                key: args?.key,
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
