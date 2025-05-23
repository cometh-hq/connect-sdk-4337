import {
    type Address,
    type Hex,
    concatHex,
    encodeAbiParameters,
    encodeFunctionData,
    encodePacked,
    toBytes,
    toHex,
} from "viem";

import { BatchCallModeNotSupportedError, NoCallsToEncodeError } from "@/errors";

export type CallType = "call" | "delegatecall" | "batchcall";

export type ExecutionMode<callType extends CallType> = {
    type: callType;
    revertOnError?: boolean;
    selector?: Hex;
    context?: Hex;
};

export type EncodeCallDataParams<callType extends CallType> = {
    mode: ExecutionMode<callType>;
    callData: readonly {
        to: Address;
        value?: bigint | undefined;
        data?: Hex | undefined;
    }[];
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

export function encode7579Calls<callType extends CallType>({
    mode,
    callData,
}: EncodeCallDataParams<callType>): Hex {
    if (callData.length > 1 && mode?.type !== "batchcall") {
        throw new BatchCallModeNotSupportedError(mode);
    }

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

    if (callData.length > 1) {
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
                                value: arg.value ?? 0n,
                                callData: arg.data ?? "0x",
                            };
                        }),
                    ]
                ),
            ],
        });
    }

    const call = callData.length === 0 ? undefined : callData[0];

    if (!call) {
        throw new NoCallsToEncodeError();
    }

    return encodeFunctionData({
        abi: executeAbi,
        functionName: "execute",
        args: [
            encodeExecutionMode(mode),
            concatHex([
                call.to,
                toHex(call.value ?? 0n, { size: 32 }),
                call.data ?? "0x",
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
