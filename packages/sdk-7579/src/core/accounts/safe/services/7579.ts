import {
    http,
    type Address,
    type Chain,
    type Hex,
    concatHex,
    createPublicClient,
    encodeAbiParameters,
    encodeFunctionData,
    encodePacked,
    keccak256,
    toBytes,
    toHex,
    zeroAddress,
    hexToBigInt,
} from "viem";
import {
    initSafe7579Abi,
    preValidationSetupAbi,
} from "../createSafeSmartAccount";
import type { Signer } from "@/core/signers/types";
import { isComethSigner } from "@/core/signers/createSigner";
import { SafeWebAuthnSharedSignerAbi } from "../abi/sharedWebAuthnSigner";


const executeAbi = [
    {
        type: "function",
        name: "execute",
        inputs: [
            {
                name: "execMode",
                type: "bytes32",
                internalType: "ExecMode",
            },
            {
                name: "executionCalldata",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
] as const;

export type CallType = "call" | "delegatecall" | "batchcall";

export type ExecutionMode<callType extends CallType> = {
    type: callType;
    revertOnError?: boolean;
    selector?: Hex;
    context?: Hex;
};

export type EncodeCallDataParams<callType extends CallType> = {
    mode: ExecutionMode<callType>;
    callData: callType extends "batchcall"
        ? {
              to: Address;
              value: bigint;
              data: Hex;
          }[]
        : {
              to: Address;
              value: bigint;
              data: Hex;
          };
};

function parseCallType(callType: CallType) {
    switch (callType) {
        case "call":
            return "0x00";
        case "batchcall":
            return "0x01";
        case "delegatecall":
            return "0xff";
    }
}

export const getPublicClient = (chain: Chain) => {
    return createPublicClient({
        transport: http(),
        chain: chain,
    });
};

export async function getSafeInitializer({
    accountSigner,
    safeWebAuthnSharedSignerContractAddress,
    safeP256VerifierAddress,
    multiSendAddress,
    owner,
    validators = [],
    executors = [],
    fallbacks = [],
    hooks = [],
    attesters = [],
    attestersThreshold = 0,
    safeSingletonAddress,
    erc7579LaunchpadAddress,
    safe7579Address,
}: {
    accountSigner:Signer,
    safeWebAuthnSharedSignerContractAddress:Address,
    safeP256VerifierAddress:Address,
    multiSendAddress:Address,
    owner: Address;
    validators?: { address: Address; context: Address }[];
    executors?: {
        address: Address;
        context: Address;
    }[];
    fallbacks?: { address: Address; context: Address }[];
    hooks?: { address: Address; context: Address }[];
    attesters?: Address[];
    attestersThreshold?: number;
    safeSingletonAddress: Address;
    erc7579LaunchpadAddress: Address;
    safe7579Address: Address;
}): Promise<Hex> {
    const safe4337ModuleAddress = safe7579Address;

    const initData = getSafeInitData({
        accountSigner,
        safeWebAuthnSharedSignerContractAddress,
        safeP256VerifierAddress,
        multiSendAddress,
        owner,
        validators,
        executors,
        fallbacks,
        hooks,
        attesters,
        attestersThreshold,
        safeSingletonAddress,
        erc7579LaunchpadAddress,
        safe4337ModuleAddress,
    });

    const initHash = keccak256(
        encodeAbiParameters(
            [
                {
                    internalType: "address",
                    name: "singleton",
                    type: "address",
                },
                {
                    internalType: "address[]",
                    name: "owners",
                    type: "address[]",
                },
                {
                    internalType: "uint256",
                    name: "threshold",
                    type: "uint256",
                },
                {
                    internalType: "address",
                    name: "setupTo",
                    type: "address",
                },
                {
                    internalType: "bytes",
                    name: "setupData",
                    type: "bytes",
                },
                {
                    internalType: "contract ISafe7579",
                    name: "safe7579",
                    type: "address",
                },
                {
                    internalType: "struct ModuleInit[]",
                    name: "validators",
                    type: "tuple[]",
                    components: [
                        {
                            internalType: "address",
                            name: "module",
                            type: "address",
                        },
                        {
                            internalType: "bytes",
                            name: "initData",
                            type: "bytes",
                        },
                    ],
                },
            ],
            [
                initData.singleton,
                initData.owners,
                initData.threshold,
                initData.setupTo,
                initData.setupData,
                initData.safe7579,
                initData.validators.map((validator) => ({
                    module: validator.address,
                    initData: validator.context,
                })),
            ]
        )
    );

    if(isComethSigner(accountSigner) && accountSigner.type === "passkey") {
        const sharedSignerConfigCallData = encodeFunctionData({
            abi: SafeWebAuthnSharedSignerAbi,
            functionName: "configure",
            args: [
                {
                    x: hexToBigInt(accountSigner.passkey.pubkeyCoordinates.x),
                    y: hexToBigInt(accountSigner.passkey.pubkeyCoordinates.y),
                    verifiers: hexToBigInt(safeP256VerifierAddress),
                },
            ],
        });

        return encodeFunctionData({
            abi: preValidationSetupAbi,
            functionName: "preValidationSetup",
            args: [initHash, "0xfD90FAd33ee8b58f32c00aceEad1358e4AFC23f9", sharedSignerConfigCallData],
        });
    }

    return encodeFunctionData({
        abi: preValidationSetupAbi,
        functionName: "preValidationSetup",
        args: [initHash, zeroAddress, "0x"],
    });
}

export const getSafeInitData = ({
 /*    accountSigner,
    safeWebAuthnSharedSignerContractAddress,
    safeP256VerifierAddress,
    multiSendAddress, */
    safe4337ModuleAddress,
    safeSingletonAddress,
    erc7579LaunchpadAddress,
    owner,
    validators,
    executors,
    fallbacks,
    hooks,
    attesters,
    attestersThreshold,
}: {
    accountSigner:Signer,
    safeWebAuthnSharedSignerContractAddress:Address,
    safeP256VerifierAddress:Address,
    multiSendAddress:Address,
    safe4337ModuleAddress: Address;
    safeSingletonAddress: Address;
    erc7579LaunchpadAddress: Address;
    owner: Address;
    executors: {
        address: Address;
        context: Address;
    }[];
    validators: { address: Address; context: Address }[];
    fallbacks: { address: Address; context: Address }[];
    hooks: { address: Address; context: Address }[];
    attesters: Address[];
    attestersThreshold: number;
}) => {

    const initSafe7579CallData = encodeFunctionData({
        abi: initSafe7579Abi,
        functionName: "initSafe7579",
        args: [
            safe4337ModuleAddress, // SAFE_7579_ADDRESS,
            executors.map((executor) => ({
                module: executor.address,
                initData: executor.context,
            })),
            fallbacks.map((fallback) => ({
                module: fallback.address,
                initData: fallback.context,
            })),
            hooks.map((hook) => ({
                module: hook.address,
                initData: hook.context,
            })),
            attesters,
            attestersThreshold,
        ],
    })



    return {
        singleton: safeSingletonAddress,
        owners: [owner],
        threshold: BigInt(1),
        setupTo: erc7579LaunchpadAddress,
        setupData: initSafe7579CallData,
        safe7579: safe4337ModuleAddress,
        validators: validators,
    };
};

export function encode7579CallData<callType extends CallType>({
    mode,
    callData,
}: EncodeCallDataParams<callType>): Hex {
    if (Array.isArray(callData) && mode?.type !== "batchcall") {
        throw new Error(
            `mode ${JSON.stringify(mode)} does not support batchcall calldata`
        );
    }

    if (Array.isArray(callData)) {
        return encodeFunctionData({
            abi: executeAbi,
            functionName: "execute",
            args: [
                encodeExecutionMode(mode),
                encodeAbiParameters(
                    [
                        {
                            name: "executionBatch",
                            type: "tuple[]",
                            components: [
                                {
                                    name: "target",
                                    type: "address",
                                },
                                {
                                    name: "value",
                                    type: "uint256",
                                },
                                {
                                    name: "callData",
                                    type: "bytes",
                                },
                            ],
                        },
                    ],
                    [
                        callData.map((arg) => {
                            return {
                                target: arg.to,
                                value: arg.value,
                                callData: arg.data,
                            };
                        }),
                    ]
                ),
            ],
        });
    }

    return encodeFunctionData({
        abi: executeAbi,
        functionName: "execute",
        args: [
            encodeExecutionMode(mode),
            concatHex([
                callData.to,
                toHex(callData.value, { size: 32 }),
                callData.data,
            ]),
        ],
    });
}

export function encodeExecutionMode<callType extends CallType>({
    type,
    revertOnError,
    selector,
    context,
}: ExecutionMode<callType>): Hex {
    return encodePacked(
        ["bytes1", "bytes1", "bytes4", "bytes4", "bytes22"],
        [
            toHex(toBytes(parseCallType(type), { size: 1 })),
            toHex(toBytes(revertOnError ? "0x01" : "0x00", { size: 1 })),
            toHex(toBytes("0x0", { size: 4 })),
            toHex(toBytes(selector ?? "0x", { size: 4 })),
            toHex(toBytes(context ?? "0x", { size: 22 })),
        ]
    );
}
