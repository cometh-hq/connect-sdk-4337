export const safeWebauthnSignerFactory = [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "signer",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "x",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "y",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "P256.Verifiers",
                name: "verifiers",
                type: "uint176",
            },
        ],
        name: "Created",
        type: "event",
    },
    {
        inputs: [],
        name: "SINGLETON",
        outputs: [
            {
                internalType: "contract SafeWebAuthnSignerSingleton",
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
                internalType: "uint256",
                name: "x",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "y",
                type: "uint256",
            },
            {
                internalType: "P256.Verifiers",
                name: "verifiers",
                type: "uint176",
            },
        ],
        name: "createSigner",
        outputs: [
            {
                internalType: "address",
                name: "signer",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "x",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "y",
                type: "uint256",
            },
            {
                internalType: "P256.Verifiers",
                name: "verifiers",
                type: "uint176",
            },
        ],
        name: "getSigner",
        outputs: [
            {
                internalType: "address",
                name: "signer",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "message",
                type: "bytes32",
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes",
            },
            {
                internalType: "uint256",
                name: "x",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "y",
                type: "uint256",
            },
            {
                internalType: "P256.Verifiers",
                name: "verifiers",
                type: "uint176",
            },
        ],
        name: "isValidSignatureForSigner",
        outputs: [
            {
                internalType: "bytes4",
                name: "magicValue",
                type: "bytes4",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];