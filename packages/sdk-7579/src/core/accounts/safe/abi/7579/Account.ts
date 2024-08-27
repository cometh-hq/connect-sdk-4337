export const AccountInterface = [
    { type: "fallback", stateMutability: "payable" },
    { type: "receive", stateMutability: "payable" },
    {
        type: "function",
        name: "accountId",
        inputs: [],
        outputs: [
            {
                name: "accountImplementationId",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "domainSeparator",
        inputs: [],
        outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "entryPoint",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "execute",
        inputs: [
            { name: "mode", type: "bytes32", internalType: "ModeCode" },
            {
                name: "executionCalldata",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "executeFromExecutor",
        inputs: [
            { name: "mode", type: "bytes32", internalType: "ModeCode" },
            {
                name: "executionCalldata",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [
            { name: "returnDatas", type: "bytes[]", internalType: "bytes[]" },
        ],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "getActiveHook",
        inputs: [],
        outputs: [{ name: "hook", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getActiveHook",
        inputs: [{ name: "selector", type: "bytes4", internalType: "bytes4" }],
        outputs: [{ name: "hook", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getExecutorsPaginated",
        inputs: [
            { name: "cursor", type: "address", internalType: "address" },
            { name: "size", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            { name: "array", type: "address[]", internalType: "address[]" },
            { name: "next", type: "address", internalType: "address" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getNonce",
        inputs: [
            { name: "safe", type: "address", internalType: "address" },
            { name: "validator", type: "address", internalType: "address" },
        ],
        outputs: [{ name: "nonce", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getValidatorPaginated",
        inputs: [
            { name: "start", type: "address", internalType: "address" },
            { name: "pageSize", type: "uint256", internalType: "uint256" },
        ],
        outputs: [
            { name: "array", type: "address[]", internalType: "address[]" },
            { name: "next", type: "address", internalType: "address" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "initializeAccount",
        inputs: [
            {
                name: "validators",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "initData", type: "bytes", internalType: "bytes" },
                ],
            },
            {
                name: "executors",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "initData", type: "bytes", internalType: "bytes" },
                ],
            },
            {
                name: "fallbacks",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "initData", type: "bytes", internalType: "bytes" },
                ],
            },
            {
                name: "hooks",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "initData", type: "bytes", internalType: "bytes" },
                ],
            },
            {
                name: "registryInit",
                type: "tuple",
                internalType: "struct RegistryInit",
                components: [
                    {
                        name: "registry",
                        type: "address",
                        internalType: "contract IERC7484",
                    },
                    {
                        name: "attesters",
                        type: "address[]",
                        internalType: "address[]",
                    },
                    { name: "threshold", type: "uint8", internalType: "uint8" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "installModule",
        inputs: [
            { name: "moduleType", type: "uint256", internalType: "uint256" },
            { name: "module", type: "address", internalType: "address" },
            { name: "initData", type: "bytes", internalType: "bytes" },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "isModuleInstalled",
        inputs: [
            { name: "moduleType", type: "uint256", internalType: "uint256" },
            { name: "module", type: "address", internalType: "address" },
            {
                name: "additionalContext",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isValidSignature",
        inputs: [
            { name: "hash", type: "bytes32", internalType: "bytes32" },
            { name: "data", type: "bytes", internalType: "bytes" },
        ],
        outputs: [
            { name: "magicValue", type: "bytes4", internalType: "bytes4" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "launchpadValidators",
        inputs: [
            {
                name: "validators",
                type: "tuple[]",
                internalType: "struct ModuleInit[]",
                components: [
                    {
                        name: "module",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "initData", type: "bytes", internalType: "bytes" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "setRegistry",
        inputs: [
            {
                name: "registry",
                type: "address",
                internalType: "contract IERC7484",
            },
            {
                name: "attesters",
                type: "address[]",
                internalType: "address[]",
            },
            { name: "threshold", type: "uint8", internalType: "uint8" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "supportsExecutionMode",
        inputs: [
            { name: "encodedMode", type: "bytes32", internalType: "ModeCode" },
        ],
        outputs: [{ name: "supported", type: "bool", internalType: "bool" }],
        stateMutability: "pure",
    },
    {
        type: "function",
        name: "supportsModule",
        inputs: [
            { name: "moduleTypeId", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "pure",
    },
    {
        type: "function",
        name: "uninstallModule",
        inputs: [
            { name: "moduleType", type: "uint256", internalType: "uint256" },
            { name: "module", type: "address", internalType: "address" },
            { name: "deInitData", type: "bytes", internalType: "bytes" },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "validateUserOp",
        inputs: [
            {
                name: "userOp",
                type: "tuple",
                internalType: "struct PackedUserOperation",
                components: [
                    {
                        name: "sender",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "nonce", type: "uint256", internalType: "uint256" },
                    { name: "initCode", type: "bytes", internalType: "bytes" },
                    { name: "callData", type: "bytes", internalType: "bytes" },
                    {
                        name: "accountGasLimits",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                    {
                        name: "preVerificationGas",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "gasFees",
                        type: "bytes32",
                        internalType: "bytes32",
                    },
                    {
                        name: "paymasterAndData",
                        type: "bytes",
                        internalType: "bytes",
                    },
                    { name: "signature", type: "bytes", internalType: "bytes" },
                ],
            },
            { name: "userOpHash", type: "bytes32", internalType: "bytes32" },
            {
                name: "missingAccountFunds",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "validSignature",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "payable",
    },
    {
        type: "event",
        name: "ERC7484RegistryConfigured",
        inputs: [
            {
                name: "smartAccount",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "registry",
                type: "address",
                indexed: true,
                internalType: "contract IERC7484",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ModuleInstalled",
        inputs: [
            {
                name: "moduleTypeId",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "module",
                type: "address",
                indexed: false,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ModuleUninstalled",
        inputs: [
            {
                name: "moduleTypeId",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "module",
                type: "address",
                indexed: false,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Safe7579Initialized",
        inputs: [
            {
                name: "safe",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "TryExecutionFailed",
        inputs: [
            {
                name: "safe",
                type: "address",
                indexed: false,
                internalType: "contract ISafe",
            },
            {
                name: "numberInBatch",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "TryExecutionsFailed",
        inputs: [
            {
                name: "safe",
                type: "address",
                indexed: false,
                internalType: "contract ISafe",
            },
            {
                name: "success",
                type: "bool[]",
                indexed: false,
                internalType: "bool[]",
            },
        ],
        anonymous: false,
    },
    { type: "error", name: "AccountAccessUnauthorized", inputs: [] },
    { type: "error", name: "AccountInitializationFailed", inputs: [] },
    { type: "error", name: "ExecutionFailed", inputs: [] },
    {
        type: "error",
        name: "FallbackInstalled",
        inputs: [{ name: "msgSig", type: "bytes4", internalType: "bytes4" }],
    },
    {
        type: "error",
        name: "HookAlreadyInstalled",
        inputs: [
            { name: "currentHook", type: "address", internalType: "address" },
        ],
    },
    { type: "error", name: "HookPostCheckFailed", inputs: [] },
    { type: "error", name: "InitializerError", inputs: [] },
    {
        type: "error",
        name: "InvalidFallbackHandler",
        inputs: [{ name: "msgSig", type: "bytes4", internalType: "bytes4" }],
    },
    { type: "error", name: "InvalidHookType", inputs: [] },
    {
        type: "error",
        name: "InvalidInitData",
        inputs: [{ name: "safe", type: "address", internalType: "address" }],
    },
    { type: "error", name: "InvalidInput", inputs: [] },
    {
        type: "error",
        name: "InvalidModule",
        inputs: [{ name: "module", type: "address", internalType: "address" }],
    },
    { type: "error", name: "LinkedListError", inputs: [] },
    { type: "error", name: "LinkedList_AlreadyInitialized", inputs: [] },
    { type: "error", name: "LinkedList_AlreadyInitialized", inputs: [] },
    {
        type: "error",
        name: "LinkedList_EntryAlreadyInList",
        inputs: [{ name: "entry", type: "address", internalType: "address" }],
    },
    {
        type: "error",
        name: "LinkedList_EntryAlreadyInList",
        inputs: [{ name: "entry", type: "address", internalType: "address" }],
    },
    {
        type: "error",
        name: "LinkedList_InvalidEntry",
        inputs: [{ name: "entry", type: "address", internalType: "address" }],
    },
    {
        type: "error",
        name: "LinkedList_InvalidEntry",
        inputs: [{ name: "entry", type: "address", internalType: "address" }],
    },
    { type: "error", name: "LinkedList_InvalidPage", inputs: [] },
    { type: "error", name: "LinkedList_InvalidPage", inputs: [] },
    {
        type: "error",
        name: "NoFallbackHandler",
        inputs: [{ name: "msgSig", type: "bytes4", internalType: "bytes4" }],
    },
    {
        type: "error",
        name: "UnsupportedCallType",
        inputs: [
            { name: "callType", type: "bytes1", internalType: "CallType" },
        ],
    },
    {
        type: "error",
        name: "UnsupportedExecType",
        inputs: [
            { name: "execType", type: "bytes1", internalType: "ExecType" },
        ],
    },
    {
        type: "error",
        name: "UnsupportedModuleType",
        inputs: [
            { name: "moduleTypeId", type: "uint256", internalType: "uint256" },
        ],
    },
    { type: "error", name: "ValidatorStorageHelperError", inputs: [] },
];
