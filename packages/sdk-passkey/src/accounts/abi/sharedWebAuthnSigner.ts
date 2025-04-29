export const SafeWebAuthnSharedSignerAbi = [
    {
        type: "constructor",
        inputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "error",
        name: "NotDelegateCalled",
        inputs: [],
    },
    {
        type: "function",
        name: "SIGNER_SLOT",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "configure",
        inputs: [
            {
                name: "signer",
                type: "tuple",
                internalType: "struct SafeWebAuthnSharedSigner.Signer",
                components: [
                    {
                        name: "x",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "y",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "verifiers",
                        type: "uint176",
                        internalType: "P256.Verifiers",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "getConfiguration",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "signer",
                type: "tuple",
                internalType: "struct SafeWebAuthnSharedSigner.Signer",
                components: [
                    {
                        name: "x",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "y",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "verifiers",
                        type: "uint176",
                        internalType: "P256.Verifiers",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isValidSignature",
        inputs: [
            {
                name: "message",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "signature",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [
            {
                name: "magicValue",
                type: "bytes4",
                internalType: "bytes4",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isValidSignature",
        inputs: [
            {
                name: "data",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "signature",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [
            {
                name: "magicValue",
                type: "bytes4",
                internalType: "bytes4",
            },
        ],
        stateMutability: "view",
    },
] as const;
