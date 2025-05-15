export const MultiSendContractABI = [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "transactions",
                type: "bytes",
            },
        ],
        name: "multiSend",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
] as const; // The `as const` assertion ensures the ABI doesn't get widened to string[] type, preserving the specific string literals
