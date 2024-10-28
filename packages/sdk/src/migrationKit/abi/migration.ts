export const MigrationAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "safeSingleton",
                type: "address",
            },
            {
                internalType: "address",
                name: "safeL2Singleton",
                type: "address",
            },
            {
                internalType: "address",
                name: "fallbackHandler",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "singleton",
                type: "address",
            },
        ],
        name: "ChangedMasterCopy",
        type: "event",
    },
    {
        inputs: [],
        name: "MIGRATION_SINGLETON",
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
        inputs: [],
        name: "SAFE_FALLBACK_HANDLER",
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
        inputs: [],
        name: "SAFE_L2_SINGLETON",
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
        inputs: [],
        name: "SAFE_SINGLETON",
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
        inputs: [],
        name: "migrateL2Singleton",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "migrateL2WithFallbackHandler",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "migrateSingleton",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "migrateWithFallbackHandler",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
