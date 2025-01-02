import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import {
    getSessionKeySigner,
    isUserOpWhitelisted,
} from "@/core/actions/accounts/safe/sessionKeys/utils";
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
import { getAccountNonce, isSmartAccountDeployed } from "permissionless";
import type {
    EntryPoint,
    GetEntryPointVersion,
    UserOperation,
} from "permissionless/_types/types";
import type { SmartAccount } from "permissionless/accounts";
import {
    SignTransactionNotSupportedBySmartAccount,
    toSmartAccount,
} from "permissionless/accounts";
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint";
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type PublicClient,
    type Transport,
    encodeFunctionData,
    encodePacked,
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
import {
    buildSignatureBytes,
    packInitCode,
    packPaymasterData,
} from "./services/utils";
import { EIP712_SAFE_OPERATION_TYPE, type SafeContractParams } from "./types";

export type SafeSmartAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "safeSmartAccount", transport, chain> & {
    buildUserOperation(
        _txs:
            | {
                  to: Address;
                  value: bigint;
                  data: Hex;
              }
            | {
                  to: Address;
                  value: bigint;
                  data: Hex;
              }[]
    ): Promise<UserOperation<"v0.7">>;
    signUserOperationWithSessionKey(
        userOp: UserOperation<GetEntryPointVersion<entryPoint>>
    ): Promise<Hex>;
    getConnectApi(): API;
    safe4337SessionKeysModule: Address;
    sessionKeysEnabled: boolean;
    signerAddress: Address;
    safeContractParams: SafeContractParams;
    comethSignerConfig?: ComethSignerConfig;
};

export type createSafeSmartAccountParameters<
    TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE,
> = Prettify<{
    apiKey: string;
    chain: Chain;
    publicClient?: PublicClient;
    baseUrl?: string;
    smartAccountAddress?: Address;
    entryPoint: TEntryPoint;
    comethSignerConfig?: ComethSignerConfig;
    safeContractConfig?: SafeContractParams;
    sessionKeysEnabled?: boolean;
    signer?: Signer;
    clientTimeout?: number;
}>;

/**
 * Get the account initialization code for a Safe smart account
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
}): Promise<Hex> => {
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
}: {
    chain: Chain;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce: Hex;
    initializer: Hex;
    signer: Signer;
    api: API;
}): Promise<{ smartAccountAddress: Address; isNewWallet: boolean }> => {
    const smartAccountAddress = await getAccountAddress({
        chain,
        singletonAddress,
        safeProxyFactoryAddress,
        saltNonce,
        initializer,
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
}: {
    chain: Chain;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce?: Hex;
    initializer: Hex;
}): Promise<Address> => {
    return getSafeAddressFromInitializer({
        chain,
        initializer,
        saltNonce: hexToBigInt(saltNonce),
        safeProxyFactoryAddress,
        safeSingletonAddress: singletonAddress,
    });
};

/**
 * Create a Safe smart account
 */
export async function createSafeSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKey,
    chain,
    publicClient,
    baseUrl,
    smartAccountAddress,
    entryPoint: entryPointAddress,
    comethSignerConfig,
    safeContractConfig,
    sessionKeysEnabled = false,
    signer,
    clientTimeout,
}: createSafeSmartAccountParameters<entryPoint>): Promise<
    SafeSmartAccount<entryPoint, TTransport, TChain>
> {
    const api = new API(apiKey, baseUrl);
    const [client, contractParams] = await Promise.all([
        getViemClient(
            chain,
            publicClient?.transport.url,
            clientTimeout
        ) as Client<TTransport, TChain, undefined>,
        getProjectParamsByChain({ api, chain }),
    ]);

    const {
        safeWebAuthnSharedSignerContractAddress,
        setUpContractAddress,
        p256Verifier,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
        safe4337ModuleAddress,
        safe4337SessionKeysModule,
        safeWebAuthnSignerFactory,
    } =
        safeContractConfig ??
        (contractParams.safeContractParams as SafeContractParams);

    if (!safe4337ModuleAddress) {
        throw new Error("Network is not supported");
    }

    if (sessionKeysEnabled && !safe4337SessionKeysModule) {
        throw new Error("Session keys not enabled for this network");
    }

    const safe4337Module = (
        sessionKeysEnabled ? safe4337SessionKeysModule : safe4337ModuleAddress
    ) as Address;

    const accountSigner = await (signer ??
        createSigner({
            apiKey,
            chain,
            smartAccountAddress,
            ...comethSignerConfig,
            rpcUrl: publicClient?.transport.url,
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

    const signerAddress = getSignerAddress(accountSigner);

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
        });
    }

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            singletonAddress: safeSingletonAddress,
            safeFactoryAddress: safeProxyFactoryAddress,
        });

    const res = await storeWalletInComethApi({
        chain,
        singletonAddress: safeSingletonAddress,
        safeProxyFactoryAddress,
        saltNonce: zeroHash,
        initializer,
        signer: accountSigner,
        api,
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

        async encodeDeployCallData(_) {
            throw new Error("Safe account doesn't support account deployment");
        },

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
        sessionKeysEnabled,
        safeContractParams:
            safeContractConfig ?? contractParams.safeContractParams,
        comethSignerConfig,
        async buildUserOperation(
            _txs:
                | {
                      to: Address;
                      value: bigint;
                      data: Hex;
                  }
                | {
                      to: Address;
                      value: bigint;
                      data: Hex;
                  }[]
        ) {
            const sender = smartAccountAddress;
            const nonce = await smartAccount.getNonce();
            const callData = await smartAccount.encodeCallData(_txs);
            const factory = await smartAccount.getFactory();
            const factoryData = await smartAccount.getFactoryData();

            const userOperation: UserOperation<"v0.7"> = {
                sender,
                nonce,
                factory,
                factoryData,
                callData,
                callGasLimit: 1n,
                verificationGasLimit: 1n,
                preVerificationGas: 1n,
                maxFeePerGas: 1n,
                maxPriorityFeePerGas: 1n,
                signature: "0x",
            };

            userOperation.signature = await smartAccount.getDummySignature(
                userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
            );
            return userOperation;
        },
        async signUserOperationWithSessionKey(
            userOp: UserOperation<GetEntryPointVersion<entryPoint>>
        ) {
            const sessionKeySigner = await getSessionKeySigner({
                chain: client?.chain as Chain,
                smartAccountAddress,
                rpcUrl: publicClient?.transport.url,
                safe4337SessionKeysModule: safe4337SessionKeysModule as Address,
            });

            if (!sessionKeySigner) throw new Error("Session key not found");

            const signer = sessionKeySigner?.eoaFallback.signer;

            const isWhitelisted = await isUserOpWhitelisted({
                chain: client?.chain as Chain,
                safe4337SessionKeysModule: safe4337SessionKeysModule as Address,
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
