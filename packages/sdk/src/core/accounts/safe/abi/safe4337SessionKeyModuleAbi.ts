export const safe4337SessionKeyModuleAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "entryPoint",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [],
        name: "ExecutionFailed",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidCaller",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidEntryPoint",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
        ],
        name: "InvalidSessionInterval",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
        ],
        name: "InvalidSessionKey",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidSessionKeyCaller",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
        ],
        name: "InvalidSignature",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
        ],
        name: "RevokedSession",
        type: "error",
    },
    {
        inputs: [],
        name: "SessionKeyExecutionFailed",
        type: "error",
    },
    {
        inputs: [],
        name: "UnsupportedEntryPoint",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "selector",
                type: "bytes4",
            },
        ],
        name: "UnsupportedExecutionFunction",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "SessionKeyAdded",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "SessionKeyRevoked",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "destination",
                type: "address",
            },
        ],
        name: "WhitelistedDestinationAdded",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "destination",
                type: "address",
            },
        ],
        name: "WhitelistedDestinationRemoved",
        type: "event",
    },
    {
        inputs: [],
        name: "SUPPORTED_ENTRYPOINT",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
            {
                internalType: "uint48",
                name: "validAfter",
                type: "uint48",
            },
            {
                internalType: "uint48",
                name: "validUntil",
                type: "uint48",
            },
            {
                internalType: "address[]",
                name: "destinations",
                type: "address[]",
            },
        ],
        name: "addSessionKey",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
            {
                internalType: "address",
                name: "destination",
                type: "address",
            },
        ],
        name: "addWhitelistDestination",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "domainSeparator",
        outputs: [
            {
                internalType: "bytes32",
                name: "domainSeparatorHash",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "contract Safe",
                name: "safe",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "message",
                type: "bytes",
            },
        ],
        name: "encodeMessageDataForSafe",
        outputs: [
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "data",
                type: "bytes",
            },
            {
                internalType: "uint8",
                name: "operation",
                type: "uint8",
            },
        ],
        name: "executeUserOp",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "data",
                type: "bytes",
            },
            {
                internalType: "uint8",
                name: "operation",
                type: "uint8",
            },
        ],
        name: "executeUserOpWithErrorString",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "target",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "data",
                        type: "bytes",
                    },
                    {
                        internalType: "bool",
                        name: "allowAllDestinations",
                        type: "bool",
                    },
                ],
                internalType: "struct SessionKeys4337.Call",
                name: "call",
                type: "tuple",
            },
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
        ],
        name: "executeWithSessionKey",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "message",
                type: "bytes",
            },
        ],
        name: "getMessageHash",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "contract Safe",
                name: "safe",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "message",
                type: "bytes",
            },
        ],
        name: "getMessageHashForSafe",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getModules",
        outputs: [
            {
                internalType: "address[]",
                name: "",
                type: "address[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "sender",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes",
                        name: "initCode",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "callData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes32",
                        name: "accountGasLimits",
                        type: "bytes32",
                    },
                    {
                        internalType: "uint256",
                        name: "preVerificationGas",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes32",
                        name: "gasFees",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes",
                        name: "paymasterAndData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "signature",
                        type: "bytes",
                    },
                ],
                internalType: "struct PackedUserOperation",
                name: "userOp",
                type: "tuple",
            },
        ],
        name: "getOperationHash",
        outputs: [
            {
                internalType: "bytes32",
                name: "operationHash",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_dataHash",
                type: "bytes32",
            },
            {
                internalType: "bytes",
                name: "_signature",
                type: "bytes",
            },
        ],
        name: "isValidSignature",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
            },
            {
                internalType: "bytes",
                name: "_signature",
                type: "bytes",
            },
        ],
        name: "isValidSignature",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256[]",
                name: "",
                type: "uint256[]",
            },
            {
                internalType: "uint256[]",
                name: "",
                type: "uint256[]",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        name: "onERC1155BatchReceived",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        name: "onERC1155Received",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        name: "onERC721Received",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
            {
                internalType: "address",
                name: "destination",
                type: "address",
            },
        ],
        name: "removeWhitelistDestination",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sessionKey",
                type: "address",
            },
        ],
        name: "revokeSession",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "sessionKeys",
        outputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint48",
                name: "validAfter",
                type: "uint48",
            },
            {
                internalType: "uint48",
                name: "validUntil",
                type: "uint48",
            },
            {
                internalType: "bool",
                name: "revoked",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "targetContract",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "calldataPayload",
                type: "bytes",
            },
        ],
        name: "simulate",
        outputs: [
            {
                internalType: "bytes",
                name: "response",
                type: "bytes",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "interfaceId",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        name: "tokensReceived",
        outputs: [],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "sender",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes",
                        name: "initCode",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "callData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes32",
                        name: "accountGasLimits",
                        type: "bytes32",
                    },
                    {
                        internalType: "uint256",
                        name: "preVerificationGas",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes32",
                        name: "gasFees",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes",
                        name: "paymasterAndData",
                        type: "bytes",
                    },
                    {
                        internalType: "bytes",
                        name: "signature",
                        type: "bytes",
                    },
                ],
                internalType: "struct PackedUserOperation",
                name: "userOp",
                type: "tuple",
            },
            {
                internalType: "bytes32",
                name: "userOpHash",
                type: "bytes32",
            },
            {
                internalType: "uint256",
                name: "missingAccountFunds",
                type: "uint256",
            },
        ],
        name: "validateUserOp",
        outputs: [
            {
                internalType: "uint256",
                name: "validationData",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "whitelistDestinations",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
