export const safeWebauthnSignerFactory = [
    {
        inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
        name: "createSigner",
        outputs: [{ internalType: "address", name: "signer", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
        name: "getSigner",
        outputs: [{ internalType: "address", name: "signer", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bytes32", name: "message", type: "bytes32" },
            { internalType: "bytes", name: "signature", type: "bytes" },
            { internalType: "bytes", name: "signerData", type: "bytes" },
        ],
        name: "isValidSignatureForSigner",
        outputs: [
            { internalType: "bytes4", name: "magicValue", type: "bytes4" },
        ],
        stateMutability: "view",
        type: "function",
    },
];
