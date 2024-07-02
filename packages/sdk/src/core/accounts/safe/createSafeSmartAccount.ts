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
    getContractAddress,
    hexToBigInt,
    keccak256,
    zeroHash,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "../../services/API";
import { getClient } from "../utils";

import { createSigner, saveSigner } from "@/core/signers/createSigner";
import type { SignerConfig } from "@/core/signers/types";

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import {
    getSessionKeySigner,
    isUserOpWhitelisted,
} from "@/core/actions/accounts/safe/sessionKeys/utils";
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
    getSafeInitializer,
} from "./services/safe";
import { buildSignatureBytes, packInitCode } from "./services/utils";
import {
    EIP712_SAFE_OPERATION_TYPE,
    type SafeContractConfig,
    SafeProxyBytecode,
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
};

/**
 * Authenticate the wallet to the cometh api
 * @param initializer
 * @param smartAccountAddress
 * @param signer
 * @param api
 * @param singletonAddress
 * @param safeProxyFactoryAddress
 */

/**
 * Get the account initialization code for a modular smart account
 * @param initializer
 * @param singletonAddress
 * @param safeFactoryAddress
 * @param saltNonce
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
 * Predict Account address from the entrypoint
 * @param singletonAddress
 * @param safeProxyFactoryAddress
 * @param saltNonce
 * @param initializer
 */
export const getAccountAddress = async ({
    singletonAddress,
    safeProxyFactoryAddress,
    saltNonce = zeroHash,
    initializer,
}: {
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
    saltNonce?: Hex;
    initializer: Hex;
}) => {
    const deploymentCode = encodePacked(
        ["bytes", "uint256"],
        [SafeProxyBytecode, hexToBigInt(singletonAddress)]
    );

    const salt = keccak256(
        encodePacked(
            ["bytes32", "uint256"],
            [
                keccak256(encodePacked(["bytes"], [initializer])),
                hexToBigInt(saltNonce),
            ]
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
    safeContractConfig?: SafeContractConfig;
}>;
/**
 * Build a safe smart account from a cometh signer
 * @param apiKey
 * @param comethSigner
 * @param rpcUrl
 * @param smartAccountAddress
 * @param entryPoint
 * @param factoryAddress
 * @param comethSignerConfig
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

    const {
        safeWebAuthnSharedSignerAddress,
        safeModuleSetUpAddress,
        safeP256VerifierAddress,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
        safe4337SessionKeysModule,
    } =
        safeContractConfig ??
        ((await api.getProjectParams()) as SafeContractConfig);

    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    const comethSigner = await createSigner({
        apiKey,
        baseUrl,
        smartAccountAddress,
        safeWebAuthnSharedSignerAddress,
        ...comethSignerConfig,
    });

    const initializer = getSafeInitializer(
        comethSigner,
        1,
        safe4337SessionKeysModule,
        [safe4337SessionKeysModule],
        safeModuleSetUpAddress,
        safeWebAuthnSharedSignerAddress,
        safeP256VerifierAddress,
        multisendAddress
    );

    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            singletonAddress: safeSingletonAddress,
            safeFactoryAddress: safeProxyFactoryAddress,
        });

    if (!smartAccountAddress) {
        smartAccountAddress = await getAccountAddress({
            singletonAddress: safeSingletonAddress,
            safeProxyFactoryAddress,
            saltNonce: zeroHash,
            initializer,
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
                    paymasterAndData: encodePacked(
                        ["address", "uint128", "uint128", "bytes"],
                        [
                            userOp.paymaster as Address,
                            userOp.paymasterVerificationGasLimit as bigint,
                            userOp.paymasterPostOpGasLimit as bigint,
                            userOp.paymasterData as Hex,
                        ]
                    ) as Hex,
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
