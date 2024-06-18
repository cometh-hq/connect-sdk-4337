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
    concat,
    encodeFunctionData,
    encodePacked,
    getContractAddress,
    hashTypedData,
    hexToBigInt,
    keccak256,
    size,
    zeroAddress,
    zeroHash,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "../../services/API";
import { getClient } from "../utils";

import { createSigner, saveSignerInStorage } from "@/core/signers/createSigner";
import type {
    ComethSigner,
    PasskeySigner,
    SignerConfig,
} from "@/core/signers/types";

import { ENTRYPOINT_ADDRESS_V07, SAFE_ADDRESSES } from "@/constants";
import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "@/core/services/comethService";
import { sign } from "@/core/signers/passkeys/passkeyService";
import { parseHex } from "@/core/signers/passkeys/utils";
import { WalletImplementation } from "@/core/types";
import { MultiSendContractABI } from "./abi/Multisend";
import { EnableModuleAbi } from "./abi/enableModule";
import { SafeAbi } from "./abi/safe";
import { safe4337ModuleAbi } from "./abi/safe4337ModuleAbi";
import { SafeProxyContractFactoryABI } from "./abi/safeProxyFactory";
import { SafeWebAuthnSharedSignerAbi } from "./abi/sharedWebAuthnSigner";
import {
    DUMMY_AUTHENTICATOR_DATA,
    DUMMY_CLIENT_DATA_FIELDS,
    buildSignatureBytes,
    getSignatureBytes,
    packPaymasterData,
} from "./utils";

export const EIP712_SAFE_OPERATION_TYPE = {
    SafeOp: [
        { type: "address", name: "safe" },
        { type: "uint256", name: "nonce" },
        { type: "bytes", name: "initCode" },
        { type: "bytes", name: "callData" },
        { type: "uint128", name: "verificationGasLimit" },
        { type: "uint128", name: "callGasLimit" },
        { type: "uint256", name: "preVerificationGas" },
        { type: "uint128", name: "maxPriorityFeePerGas" },
        { type: "uint128", name: "maxFeePerGas" },
        { type: "bytes", name: "paymasterAndData" },
        { type: "uint48", name: "validAfter" },
        { type: "uint48", name: "validUntil" },
        { type: "address", name: "entryPoint" },
    ],
};

export type MultiSendTransaction = {
    // 0 for CALL, 1 for DELEGATECALL
    op: 0 | 1;
    to: Address;
    value?: any;
    data: Hex;
};

type WebAuthnSharedSignerData = {
    x: Hex;
    y: Hex;
    verifiers: Address;
};

const {
    SAFE_4337_MODULE_ADDRESS,
    SAFE_WEBAUTHN_SHARED_SIGNER_ADDRESS,
    SAFE_MODULE_SETUP_ADDRESS,
    MULTISEND_ADDRESS,
    SAFE_PROXY_FACTORY_ADDRESS,
    SINGLETON_ADDRESS,
    P256_VERIFIER_ADDRESS,
} = SAFE_ADDRESSES;

// Hardcoded because we cannot easily install @safe-global/safe-contracts because of conflicting ethers.js versions
const SafeProxyBytecode =
    "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";

export type SafeSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "safeSmartAccount", transport, chain>;

/**
 * Authenticate the wallet to the cometh api
 * @param client
 * @param entryPointAddress
 * @param initCodeProvider
 * @param smartAccountAddress
 * @param signer
 * @param api
 */
const authenticateToComethApi = async ({
    initializer,
    smartAccountAddress,
    signer,
    api,
}: {
    initializer: Hex;
    smartAccountAddress?: Address;
    signer: ComethSigner;
    api: API;
}): Promise<Address> => {
    if (smartAccountAddress) {
        await connectToExistingWallet({
            api,
            smartAccountAddress,
        });
    } else {
        smartAccountAddress = await getAccountAddress({
            singletonAddress: SINGLETON_ADDRESS,
            safeProxyFactoryAddress: SAFE_PROXY_FACTORY_ADDRESS,
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

const getSetUpData = ({
    modules,
    signer,
}: {
    modules: Address[];
    signer: WebAuthnSharedSignerData;
}) => {
    const encodeMultisendTransactions = (
        transactions: MultiSendTransaction[]
    ) => {
        return concat(
            transactions.map(({ op, to, value, data }) =>
                encodePacked(
                    ["uint8", "address", "uint256", "uint256", "bytes"],
                    [
                        op,
                        to,
                        value ?? 0,
                        BigInt(size(data)),
                        data as `0x${string}`,
                    ]
                )
            )
        );
    };

    const enableModuleCallData = encodeFunctionData({
        abi: EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    });

    const sharedSignerConfigCallData = encodeFunctionData({
        abi: SafeWebAuthnSharedSignerAbi,
        functionName: "configure",
        args: [
            {
                x: hexToBigInt(signer.x),
                y: hexToBigInt(signer.y),
                verifiers: hexToBigInt(signer.verifiers),
            },
        ],
    });

    return encodeFunctionData({
        abi: MultiSendContractABI,
        functionName: "multiSend",
        args: [
            encodeMultisendTransactions([
                {
                    op: 1 as const,
                    to: SAFE_MODULE_SETUP_ADDRESS,
                    data: enableModuleCallData,
                },
                {
                    op: 1 as const,
                    to: SAFE_WEBAUTHN_SHARED_SIGNER_ADDRESS,
                    data: sharedSignerConfigCallData,
                },
            ]),
        ],
    });
};

const getSafeInitializer = (
    owners: string[],
    threshold: number,
    fallbackHandler: Address,
    setupTo = zeroAddress as Address,
    setupData = "0x"
): Hex => {
    return encodeFunctionData({
        abi: SafeAbi,
        functionName: "setup",
        args: [
            owners,
            threshold,
            setupTo,
            setupData,
            fallbackHandler,
            zeroAddress,
            0,
            zeroAddress,
        ],
    });
};

/**
 * Get the account initialization code for a modular smart account
 * @param modules
 * @param signer
 * @param saltNonce
 */
const getAccountInitCode = async ({
    initializer,
    safeFactoryAddress,
    saltNonce = zeroHash,
}: {
    initializer: Hex;
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
                args: [SINGLETON_ADDRESS, initializer, hexToBigInt(saltNonce)],
            }),
        ]
    );
};

/**
 * Predict Account address from the entrypoint
 * @param client
 * @param entryPointAddress
 * @param initCodeProvider
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
    comethSigner?: PasskeySigner;
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
 * @param comethSigner
 * @param apiKey
 * @param rpcUrl
 * @param smartAccountAddress
 * @param entryPoint
 * @param factoryAddress
 * @param owners
 * @param salt
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
    /*   const contractParams = await api.getContractParams(
        WalletImplementation.Safe
    ); */
    const contractParams = SAFE_ADDRESSES;

    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    if (!comethSigner) {
        comethSigner = (await createSigner({
            apiKey,
            baseUrl,
            smartAccountAddress,
            ...comethSignerConfig,
        })) as PasskeySigner;
    }

    factoryAddress = contractParams.SAFE_PROXY_FACTORY_ADDRESS;

    if (!factoryAddress) throw new Error("factoryAddress not found");

    //let ownerAddress: Address;

    /*   if (comethSigner.type === "localWallet") {
        ownerAddress = comethSigner.eoaFallback.signer.address;
    } else { */
    //ownerAddress = comethSigner.passkey.signerAddress;
    /*     } */

    const signer = {
        x: comethSigner.passkey.pubkeyCoordinates.x,
        y: comethSigner.passkey.pubkeyCoordinates.y,
        verifiers: P256_VERIFIER_ADDRESS,
    };

    const setUpData = getSetUpData({
        modules: [SAFE_4337_MODULE_ADDRESS],
        signer,
    });

    const owners = [SAFE_WEBAUTHN_SHARED_SIGNER_ADDRESS];
    const initializer = getSafeInitializer(
        owners,
        1,
        SAFE_4337_MODULE_ADDRESS,
        MULTISEND_ADDRESS,
        setUpData
    );

    // Helper to generate the init code for the smart account
    const generateInitCode = () =>
        getAccountInitCode({
            initializer,
            safeFactoryAddress: factoryAddress,
        });

    smartAccountAddress = await authenticateToComethApi({
        initializer,
        smartAccountAddress,
        signer: comethSigner,
        api,
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

        // Get the nonce of the smart account
        async getNonce() {
            return getAccountNonce(client, {
                sender: smartAccountAddress,
                entryPoint: entryPointAddress,
            });
        },

        // Sign a user operation
        async signUserOperation(userOp) {
            const safeOp = {
                callData: userOp.callData,
                nonce: userOp.nonce,
                initCode: `${userOp.factory}${userOp.factoryData?.slice(2)}`,
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

            console.log({ safeOp });

            const hash = hashTypedData({
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: SAFE_4337_MODULE_ADDRESS,
                },
                types: EIP712_SAFE_OPERATION_TYPE,
                primaryType: "SafeOp",
                message: {
                    callData: userOp.callData,
                    nonce: userOp.nonce,
                    initCode: `${userOp.factory}${userOp.factoryData?.slice(
                        2
                    )}`,
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
            });

            console.log({ hash });

            const publicKeyCredential: PublicKeyCredentialDescriptor = {
                id: parseHex(comethSigner.passkey.id),
                type: "public-key",
            };

            const passkeySignature = await sign(hash, [publicKeyCredential]);

            console.log({ passkeySignature });

            const signatureBytes = buildSignatureBytes([
                {
                    signer: contractParams.SAFE_WEBAUTHN_SHARED_SIGNER_ADDRESS,
                    data: passkeySignature.signature,
                    dynamic: true,
                },
            ]) as Hex;

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
        async encodeCallData(_tx: any) {
            const getExecuteUserOpData = (
                to: string,
                value: number,
                data: string,
                operation: 0 | 1
            ): Hex => {
                return encodeFunctionData({
                    abi: safe4337ModuleAbi,
                    functionName: "executeUserOpWithErrorString",
                    args: [to, value, data, operation],
                });
            };

            return getExecuteUserOpData(_tx.to, _tx.value, _tx.data, 0);
        },

        async getDummySignature() {
            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [
                    0,
                    0,
                    buildSignatureBytes([
                        {
                            signer: contractParams.SAFE_WEBAUTHN_SHARED_SIGNER_ADDRESS,
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
