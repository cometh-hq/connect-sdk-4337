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

import { createSigner, saveSignerInStorage } from "@/core/signers/createSigner";
import type { ComethSigner, SignerConfig } from "@/core/signers/types";

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "@/core/services/comethService";
import { sign } from "@/core/signers/passkeys/passkeyService";
import { parseHex } from "@/core/signers/passkeys/utils";
import { WalletImplementation } from "@/core/types";
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
    buildSignatureBytes,
    getSignatureBytes,
    packInitCode,
    packPaymasterData,
} from "./services/utils";
import { EIP712_SAFE_OPERATION_TYPE, SafeProxyBytecode } from "./types";

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
const authenticateToComethApi = async ({
    initializer,
    smartAccountAddress,
    signer,
    api,
    singletonAddress,
    safeProxyFactoryAddress,
}: {
    initializer: Hex;
    smartAccountAddress?: Address;
    signer: ComethSigner;
    api: API;
    singletonAddress: Address;
    safeProxyFactoryAddress: Address;
}): Promise<Address> => {
    if (smartAccountAddress) {
        await connectToExistingWallet({
            api,
            smartAccountAddress,
        });
    } else {
        smartAccountAddress = await getAccountAddress({
            singletonAddress,
            safeProxyFactoryAddress,
            saltNonce: zeroHash,
            initializer,
        });

        await createNewWalletInDb({
            api,
            smartAccountAddress,
            signer,
            walletImplementation: WalletImplementation.Safe,
        });
        await saveSignerInStorage(signer, smartAccountAddress);
    }
    return smartAccountAddress;
};

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
    comethSigner?: ComethSigner;
    rpcUrl?: string;
    baseUrl?: string;
    smartAccountAddress?: Address;
    entryPoint: entryPoint;
    factoryAddress?: Address;
    owners?: Address[];
    salt?: bigint;
    comethSignerConfig?: SignerConfig;
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
    comethSigner,
    rpcUrl,
    baseUrl,
    smartAccountAddress,
    entryPoint: entryPointAddress,
    factoryAddress,
    comethSignerConfig,
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
    } = await api.getContractParams(WalletImplementation.Safe);

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
            ...comethSignerConfig,
        });
    }

    factoryAddress = safeProxyFactoryAddress as Address;

    if (!factoryAddress) throw new Error("factoryAddress not found");

    const initializer = getSafeInitializer(
        comethSigner,
        1,
        safe4337ModuleAddress as Address,
        [safe4337ModuleAddress as Address],
        safeModuleSetUpAddress as Address,
        safeWebAuthnSharedSignerAddress as Address,
        safeP256VerifierAddress as Address,
        multisendAddress as Address
    );

    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            singletonAddress: safeSingletonAddress as Address,
            safeFactoryAddress: factoryAddress,
        });

    smartAccountAddress = await authenticateToComethApi({
        initializer,
        smartAccountAddress,
        signer: comethSigner,
        api,
        singletonAddress: safeSingletonAddress as Address,
        safeProxyFactoryAddress: factoryAddress,
    });

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
            const safeOp = {
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
            };

            let signatureBytes: Hex;

            if (comethSigner.type === "localWallet") {
                signatureBytes = buildSignatureBytes([
                    {
                        signer: comethSigner.eoaFallback.signer.address,
                        data: await comethSigner.eoaFallback.signer.signTypedData(
                            {
                                domain: {
                                    chainId: client.chain?.id,
                                    verifyingContract:
                                        safe4337ModuleAddress as Address,
                                },
                                types: EIP712_SAFE_OPERATION_TYPE,
                                primaryType: "SafeOp",
                                message: safeOp,
                            }
                        ),
                    },
                ]) as Hex;
            } else {
                const hash = hashTypedData({
                    domain: {
                        chainId: client.chain?.id,
                        verifyingContract: safe4337ModuleAddress as Address,
                    },
                    types: EIP712_SAFE_OPERATION_TYPE,
                    primaryType: "SafeOp",
                    message: safeOp,
                });

                const publicKeyCredential: PublicKeyCredentialDescriptor = {
                    id: parseHex(comethSigner.passkey.id),
                    type: "public-key",
                };

                const passkeySignature = await sign(hash, [
                    publicKeyCredential,
                ]);

                signatureBytes = buildSignatureBytes([
                    {
                        signer: safeWebAuthnSharedSignerAddress as Address,
                        data: passkeySignature.signature,
                        dynamic: true,
                    },
                ]) as Hex;
            }

            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [0, 0, signatureBytes]
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

            return factoryAddress;
        },

        async getFactoryData() {
            if (smartAccountDeployed) return undefined;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (smartAccountDeployed) return undefined;

            const initCode = await generateInitCode();

            return `0x${initCode.slice(factoryAddress.length)}`;
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
                    args: [
                        multisendAddress as Address,
                        BigInt(0),
                        userOpCalldata,
                        1,
                    ],
                });
            } else {
                return encodeFunctionData({
                    abi: safe4337ModuleAbi,
                    functionName: "executeUserOpWithErrorString",
                    args: [_tx.to, _tx.value, _tx.data, 0],
                });
            }
        },

        async getDummySignature() {
            if (comethSigner.type === "localWallet") {
                return "0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
            } else {
                return encodePacked(
                    ["uint48", "uint48", "bytes"],
                    [
                        0,
                        0,
                        buildSignatureBytes([
                            {
                                signer: safeWebAuthnSharedSignerAddress as Address,
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
            }
        },
    });
}
