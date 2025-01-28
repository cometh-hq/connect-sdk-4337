export const LaunchpadAbi = [
    {
        inputs: [
            { internalType: "address", name: "entryPoint", type: "address" },
            {
                internalType: "contract IERC7484",
                name: "registry",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    { inputs: [], name: "InvalidEntryPoint", type: "error" },
    { inputs: [], name: "InvalidInitHash", type: "error" },
    { inputs: [], name: "InvalidSetup", type: "error" },
    { inputs: [], name: "InvalidSignature", type: "error" },
    { inputs: [], name: "InvalidUserOperationData", type: "error" },
    { inputs: [], name: "OnlyDelegatecall", type: "error" },
    { inputs: [], name: "OnlyProxy", type: "error" },
    { inputs: [], name: "PreValidationSetupFailed", type: "error" },
    { inputs: [], name: "Safe7579LaunchpadAlreadyInitialized", type: "error" },
    {
        inputs: [
            { internalType: "bytes", name: "contractSignature", type: "bytes" },
        ],
        name: "WrongContractSignature",
        type: "error",
    },
    {
        inputs: [
            { internalType: "uint256", name: "s", type: "uint256" },
            {
                internalType: "uint256",
                name: "contractSignatureLen",
                type: "uint256",
            },
            { internalType: "uint256", name: "signaturesLen", type: "uint256" },
        ],
        name: "WrongContractSignatureFormat",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "moduleTypeId",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "module",
                type: "address",
            },
        ],
        name: "ModuleInstalled",
        type: "event",
    },
    {
        inputs: [],
        name: "REGISTRY",
        outputs: [
            { internalType: "contract IERC7484", name: "", type: "address" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "SUPPORTED_ENTRYPOINT",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "accountId",
        outputs: [
            {
                internalType: "string",
                name: "accountImplementationId",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "safe7579", type: "address" },
            {
                components: [
                    {
                        internalType: "address",
                        name: "module",
                        type: "address",
                    },
                    { internalType: "bytes", name: "initData", type: "bytes" },
                ],
                internalType: "struct ModuleInit[]",
                name: "validators",
                type: "tuple[]",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "module",
                        type: "address",
                    },
                    { internalType: "bytes", name: "initData", type: "bytes" },
                ],
                internalType: "struct ModuleInit[]",
                name: "executors",
                type: "tuple[]",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "module",
                        type: "address",
                    },
                    { internalType: "bytes", name: "initData", type: "bytes" },
                ],
                internalType: "struct ModuleInit[]",
                name: "fallbacks",
                type: "tuple[]",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "module",
                        type: "address",
                    },
                    { internalType: "bytes", name: "initData", type: "bytes" },
                ],
                internalType: "struct ModuleInit[]",
                name: "hooks",
                type: "tuple[]",
            },
            { internalType: "address[]", name: "attesters", type: "address[]" },
            { internalType: "uint8", name: "threshold", type: "uint8" },
        ],
        name: "addSafe7579",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "domainSeparator",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getInitHash",
        outputs: [{ internalType: "bytes32", name: "value", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
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
                    { internalType: "bytes", name: "setupData", type: "bytes" },
                    {
                        internalType: "contract ISafe7579",
                        name: "safe7579",
                        type: "address",
                    },
                    {
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
                        internalType: "struct ModuleInit[]",
                        name: "validators",
                        type: "tuple[]",
                    },
                    { internalType: "bytes", name: "callData", type: "bytes" },
                ],
                internalType: "struct Safe7579Launchpad.InitData",
                name: "data",
                type: "tuple",
            },
        ],
        name: "hash",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "safe7579", type: "address" },
            {
                components: [
                    {
                        internalType: "address",
                        name: "module",
                        type: "address",
                    },
                    { internalType: "bytes", name: "initData", type: "bytes" },
                ],
                internalType: "struct ModuleInit[]",
                name: "executors",
                type: "tuple[]",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "module",
                        type: "address",
                    },
                    { internalType: "bytes", name: "initData", type: "bytes" },
                ],
                internalType: "struct ModuleInit[]",
                name: "fallbacks",
                type: "tuple[]",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "module",
                        type: "address",
                    },
                    { internalType: "bytes", name: "initData", type: "bytes" },
                ],
                internalType: "struct ModuleInit[]",
                name: "hooks",
                type: "tuple[]",
            },
            { internalType: "address[]", name: "attesters", type: "address[]" },
            { internalType: "uint8", name: "threshold", type: "uint8" },
        ],
        name: "initSafe7579",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bytes32", name: "initHash", type: "bytes32" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "bytes", name: "preInit", type: "bytes" },
        ],
        name: "preValidationSetup",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "singleton", type: "address" },
            {
                internalType: "address",
                name: "safeProxyFactory",
                type: "address",
            },
            { internalType: "bytes", name: "creationCode", type: "bytes" },
            { internalType: "bytes32", name: "salt", type: "bytes32" },
            {
                internalType: "bytes",
                name: "factoryInitializer",
                type: "bytes",
            },
        ],
        name: "predictSafeAddress",
        outputs: [
            { internalType: "address", name: "safeProxy", type: "address" },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
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
                    { internalType: "bytes", name: "setupData", type: "bytes" },
                    {
                        internalType: "contract ISafe7579",
                        name: "safe7579",
                        type: "address",
                    },
                    {
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
                        internalType: "struct ModuleInit[]",
                        name: "validators",
                        type: "tuple[]",
                    },
                    { internalType: "bytes", name: "callData", type: "bytes" },
                ],
                internalType: "struct Safe7579Launchpad.InitData",
                name: "initData",
                type: "tuple",
            },
        ],
        name: "setupSafe",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "ModeCode", name: "encodedMode", type: "bytes32" },
        ],
        name: "supportsExecutionMode",
        outputs: [{ internalType: "bool", name: "supported", type: "bool" }],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "moduleTypeId", type: "uint256" },
        ],
        name: "supportsModule",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
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
                    { internalType: "uint256", name: "nonce", type: "uint256" },
                    { internalType: "bytes", name: "initCode", type: "bytes" },
                    { internalType: "bytes", name: "callData", type: "bytes" },
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
                    { internalType: "bytes", name: "signature", type: "bytes" },
                ],
                internalType: "struct PackedUserOperation",
                name: "userOp",
                type: "tuple",
            },
            { internalType: "bytes32", name: "userOpHash", type: "bytes32" },
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
    { stateMutability: "payable", type: "receive" },
];
