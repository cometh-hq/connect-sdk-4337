import { getAccountNonce, isSmartAccountDeployed } from "permissionless";
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
    type Transport,
    encodeFunctionData,
    encodePacked,
    getContractAddress,
    hashTypedData,
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

import { sign } from "@/core/signers/passkeys/passkeyService";
import { parseHex } from "@/core/signers/passkeys/utils";
import { MultiSendContractABI } from "./abi/Multisend";
import { safe4337ModuleAbi } from "./abi/safe4337ModuleAbi";
import { SafeProxyContractFactoryABI } from "./abi/safeProxyFactory";
import {
    encodeMultiSendTransactions,
    getSafeInitializer,
} from "./services/safe";
import {
    DUMMY_AUTHENTICATOR_DATA,
    DUMMY_CLIENT_DATA_FIELDS,
    ECDSA_DUMMY_SIGNATURE,
    buildSignatureBytes,
    getSignatureBytes,
    packInitCode,
    packPaymasterData,
} from "./services/utils";
import {
    EIP712_SAFE_OPERATION_TYPE,
    type SafeContractConfig,
    SafeProxyBytecode,
} from "./types";

export type SafeSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "safeSmartAccount", transport, chain>;

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
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
> = Prettify<{
    apiKey: string;
    rpcUrl?: string;
    baseUrl?: string;
    smartAccountAddress?: Address;
    entryPoint: entryPoint;
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
    TChain extends Chain | undefined = Chain | undefined,
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
        safe4337ModuleAddress,
        safeModuleSetUpAddress,
        safeP256VerifierAddress,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
    } =
        safeContractConfig ??
        ((await api.getContractParams()) as SafeContractConfig);

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
        safe4337ModuleAddress,
        [safe4337ModuleAddress],
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

    return toSmartAccount({
        address: smartAccountAddress,
        async signMessage() {
            return "0x";
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
            const payload = {
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: safe4337ModuleAddress,
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
                        paymaster: userOp.paymaster as Hex,
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

            if (comethSigner.type === "localWallet") {
                return encodePacked(
                    ["uint48", "uint48", "bytes"],
                    [
                        0,
                        0,
                        buildSignatureBytes([
                            {
                                signer: comethSigner.eoaFallback.signer.address,
                                data:
                                    await comethSigner.eoaFallback.signer.signTypedData(
                                        payload
                                    ),
                            },
                        ]) as Hex,
                    ]
                );
            }
            const hash = hashTypedData(payload);

            const publicKeyCredential: PublicKeyCredentialDescriptor = {
                id: parseHex(comethSigner.passkey.id),
                type: "public-key",
            };

            const passkeySignature = await sign(hash, [publicKeyCredential]);

            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [
                    0,
                    0,
                    buildSignatureBytes([
                        {
                            signer: safeWebAuthnSharedSignerAddress,
                            data: passkeySignature.signature,
                            dynamic: true,
                        },
                    ]) as Hex,
                ]
            );
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

        async getDummySignature() {
            if (comethSigner.type === "localWallet") {
                return ECDSA_DUMMY_SIGNATURE;
            }

            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [
                    0,
                    0,
                    buildSignatureBytes([
                        {
                            signer: safeWebAuthnSharedSignerAddress,
                            data: getSignatureBytes({
                                authenticatorData: DUMMY_AUTHENTICATOR_DATA,
                                clientDataFields: DUMMY_CLIENT_DATA_FIELDS,
                                r: BigInt(`0x${"ec".repeat(32)}`),
                                s: BigInt(`0x${"d5a".repeat(21)}f`),
                            }),
                            dynamic: true,
                        },
                    ]) as Hex,
                ]
            );
        },
    });
}
