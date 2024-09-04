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
    encodeFunctionData,
    encodePacked,
    hexToBigInt,
    zeroHash,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";
import { getClient } from "../utils";

import { createSigner, saveSigner } from "@/core/signers/createSigner";
import type { ComethSigner, SignerConfig } from "@/core/signers/types";

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import {
    getSessionKeySigner,
    isUserOpWhitelisted,
} from "@/core/actions/accounts/safe/sessionKeys/utils";
import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "@/core/services/comethService";
import type {
    EntryPoint,
    GetEntryPointVersion,
    UserOperation,
} from "permissionless/_types/types";
import { MultiSendContractABI } from "./abi/Multisend";
import { safe4337ModuleAbi } from "./abi/safe4337ModuleAbi";
import { SafeProxyContractFactoryABI } from "./abi/safeProxyFactory";
import { comethSignerToSafeSigner } from "./safeSigner/comethSignerToSafeSigner";
import {
    encodeMultiSendTransactions,
    getSafeAddressFromInitializer,
    getSafeInitializer,
} from "./services/safe";
import {
    buildSignatureBytes,
    packInitCode,
    packPaymasterData,
} from "./services/utils";
import {
    EIP712_SAFE_OPERATION_TYPE,
    type ProjectParams,
    type SafeContractParams,
} from "./types";
import { toSmartAccount } from "./utils";

export type SafeSmartAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "safeSmartAccount", transport, chain> & {
    signUserOperationWithSessionKey(
        userOp: UserOperation<GetEntryPointVersion<entryPoint>>
    ): Promise<Hex>;
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
    singletonAddress,
    safeFactoryAddress,
    saltNonce = zeroHash,
}: {
    initializer: Hex;
    singletonAddress: Address;
    safeFactoryAddress: Address;
    saltNonce?: Hex;
}) => {
    return encodePacked(
        ["address", "bytes"],
        [
            safeFactoryAddress,
            encodeFunctionData({
                abi: SafeProxyContractFactoryABI,
                functionName: "createProxyWithNonce",
                args: [singletonAddress, initializer, hexToBigInt(saltNonce)],
            }),
        ]
    );
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
const authenticateToComethApi = async ({
    chain,
    singletonAddress,
    safeProxyFactoryAddress,
    saltNonce,
    initializer,
    signer,
    api,
}: {
    chain: Chain;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce: Hex;
    initializer: Hex;
    signer: ComethSigner;
    api: API;
}): Promise<Address> => {
    const smartAccountAddress = await getAccountAddress({
        chain,
        singletonAddress,
        safeProxyFactoryAddress,
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
export const getAccountAddress = async ({
    chain,
    singletonAddress,
    safeProxyFactoryAddress,
    saltNonce = zeroHash,
    initializer,
}: {
    chain: Chain;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce?: Hex;
    initializer: Hex;
}) => {
    return getSafeAddressFromInitializer({
        chain,
        initializer,
        saltNonce: hexToBigInt(saltNonce),
        safeProxyFactoryAddress,
        safeSingletonAddress: singletonAddress,
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
}: createSafeSmartAccountParameters<entryPoint>): Promise<
    SafeSmartAccount<entryPoint, TTransport, TChain>
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
        setUpContractAddress,
        p256Verifier,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
        safe4337SessionKeysModule,
        safeWebAuthnSignerFactory,
    } =
        safeContractConfig ??
        ((await api.getProjectParams()) as ProjectParams).safeContractParams;

    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    const comethSigner = await createSigner({
        apiKey,
        chain: client.chain as Chain,
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
            fallbackHandler: safe4337SessionKeysModule,
            safe4337SessionKeysModule,
            safeWebAuthnSignerFactory,
        },
    });

    const signerAddress =
        comethSigner.type === "localWallet"
            ? comethSigner.eoaFallback.signer.address
            : comethSigner.passkey.signerAddress;

    const initializer = getSafeInitializer({
        comethSigner,
        threshold: 1,
        fallbackHandler: safe4337SessionKeysModule,
        modules: [safe4337SessionKeysModule],
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress,
        p256Verifier,
        multisendAddress,
    });

    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            singletonAddress: safeSingletonAddress,
            safeFactoryAddress: safeProxyFactoryAddress,
        });

    if (!smartAccountAddress) {
        smartAccountAddress = await authenticateToComethApi({
            chain: client.chain as Chain,
            singletonAddress: safeSingletonAddress,
            safeProxyFactoryAddress,
            saltNonce: zeroHash,
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
            safe4337SessionKeysModule,
            smartAccountAddress,
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

            return await generateInitCode();
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

            const initCode = await generateInitCode();

            return `0x${initCode.slice(safeProxyFactoryAddress.length)}`;
        },

        // Encode the deploy call data
        async encodeDeployCallData(_) {
            throw new Error("Safe account doesn't support account deployment");
        },

        // Encode a call
        async encodeCallData(_tx) {
            if (Array.isArray(_tx)) {
                const userOpCalldata = encodeFunctionData({
                    abi: MultiSendContractABI,
                    functionName: "multiSend",
                    args: [
                        encodeMultiSendTransactions(
                            _tx.map((tx) => ({
                                op: 0,
                                to: tx.to,
                                data: tx.data,
                                value: tx.value ?? BigInt(0),
                            }))
                        ),
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
                args: [_tx.to, _tx.value, _tx.data, 0],
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
        async signUserOperationWithSessionKey(
            userOp: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
            const sessionKeySigner = await getSessionKeySigner({
                chain: client?.chain as Chain,
                smartAccountAddress,
                rpcUrl,
                safe4337SessionKeysModule,
            });

            if (!sessionKeySigner) throw new Error("Session key not found");

            const signer = sessionKeySigner?.eoaFallback.signer;

            const isWhitelisted = await isUserOpWhitelisted({
                chain: client?.chain as Chain,
                safe4337SessionKeysModule,
                sessionKey: signer?.address as Address,
                userOperation: userOp,
                multisend: multisendAddress,
                smartAccountAddress,
            });

            if (!isWhitelisted)
                throw new Error("Transactions are not whitelisted");

            const payload = {
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: safe4337SessionKeysModule,
                },
                types: EIP712_SAFE_OPERATION_TYPE,
                primaryType: "SafeOp" as const,
                message: {
                    callData: userOp.callData,
                    nonce: userOp.nonce,
                    initCode: packInitCode({
                        factory: userOp.factory,
                        factoryData: userOp.factoryData,
                    }),
                    paymasterAndData: packPaymasterData({
                        paymaster: userOp.paymaster as Address,
                        paymasterVerificationGasLimit:
                            userOp.paymasterVerificationGasLimit as bigint,
                        paymasterPostOpGasLimit:
                            userOp.paymasterPostOpGasLimit as bigint,
                        paymasterData: userOp.paymasterData as Hex,
                    }),
                    preVerificationGas: userOp.preVerificationGas,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    validAfter: 0,
                    validUntil: 0,
                    safe: userOp.sender,
                    verificationGasLimit: userOp.verificationGasLimit,
                    callGasLimit: userOp.callGasLimit,
                    maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
                    maxFeePerGas: userOp.maxFeePerGas,
                },
            };

            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [
                    0,
                    0,
                    buildSignatureBytes([
                        {
                            signer: sessionKeySigner?.eoaFallback.signer
                                .address as Address,
                            data: (await signer?.signTypedData(payload)) as Hex,
                        },
                    ]) as Hex,
                ]
            );
        },
        getConnectApi(): API {
            return api;
        },
    };
}
