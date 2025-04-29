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
