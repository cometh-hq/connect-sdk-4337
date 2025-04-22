export const EIP712_SAFE_TX_TYPES = {
    SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
    ],
};

export type RelayedTransaction = {
    safeTxHash: string;
    relayId: string;
};

export type RelayedTransactionStatus = {
    received: {
        date: Date;
    };
    attributed?: {
        date: Date;
        relayerAddress: string;
    };
    sent?: {
        date: Date;
        hash: string;
        gasLimit: string;
        maxPriorityFeePerGas: string;
        maxFeePerGas: string;
        nonce: number;
    };
    rebroadcasted?: {
        date: Date;
        hash: string;
        gasLimit: string;
        maxPriorityFeePerGas: string;
        maxFeePerGas: string;
        nonce: number;
    }[];
    confirmed?: {
        date: Date;
        hash: string;
        gasUsed: string;
        effectiveGasPrice: string;
        status: number;
    };
};

export type RelayedTransactionDetails = {
    id: string;
    to: string;
    data: string;
    projectId?: string;
    isSponsored?: boolean;
    status: RelayedTransactionStatus;
};

export declare enum OperationType {
    Call = 0,
    DelegateCall = 1,
}

export interface MetaTransactionData {
    readonly to: string;
    readonly value: string;
    readonly data: string;
    readonly operation?: OperationType | string;
}

export interface SafeTransactionDataPartial extends MetaTransactionData {
    readonly operation?: OperationType | string;
    readonly safeTxGas?: number | string;
    readonly baseGas?: number | string;
    readonly gasPrice?: number | string;
    readonly gasToken?: number | string;
    readonly refundReceiver?: string;
    readonly nonce?: number | string;
}

export type RelayTransactionType = {
    safeTxData: SafeTransactionDataPartial;
    signatures: string;
    walletAddress: string;
};

export type DeviceData = {
    browser: string;
    os: string;
    platform: string;
};

export type WebAuthnDeploymentParams = {
    P256FactoryContract: string;
};

export type WebAuthnSigner = {
    projectId: string;
    userId: string;
    chainId: string;
    walletAddress: string;
    publicKeyId: string;
    publicKeyX: string;
    publicKeyY: string;
    signerAddress: string;
    deviceData: DeviceData;
    deploymentParams: WebAuthnDeploymentParams;
    creationDate?: Date;
};

export type ProjectParams = {
    chainId: string;
    P256FactoryContractAddress: string;
    multisendContractAddress: string;
    singletonAddress: string;
    simulateTxAcessorAddress: string;
    deploymentManagerAddress: string;
    guardianId: string;
    moduleFactoryAddress: string;
    delayModuleAddress: string;
    recoveryCooldown: number;
    recoveryExpiration: number;
};
