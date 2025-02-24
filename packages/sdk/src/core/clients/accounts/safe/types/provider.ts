import type { Address, Hex } from "viem"

// wallet_sendCalls
export type SendCallsParams = {
    version: string
    chainId: `0x${string}` // Hex chain id
    from: `0x${string}`
    calls: {
        to?: `0x${string}`
        data?: `0x${string}`
        value?: `0x${string}` // Hex value
    }[]
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    capabilities?: Record<string, any>
}

export type SendCallsResult = string

// wallet_getCallStatus
export type GetCallsParams = string

export enum CallStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
}

export type GetCallsResult = {
    status: CallStatus
    receipts?: {
        logs: {
            address: `0x${string}`
            data: `0x${string}`
            topics: `0x${string}`[]
        }[]
        status: `0x${string}` // Hex 1 or 0 for success or failure, respectively
        blockHash: `0x${string}`
        blockNumber: `0x${string}`
        gasUsed: `0x${string}`
        transactionHash: `0x${string}`
    }[]
}

export type PermissionRequest = {
    chainId: Hex; // hex-encoding of uint256
    address?: Address;
    expiry: number; // unix timestamp
    signer: {
      type: string; // enum defined by ERCs
      data: Record<string, any>;
    };
    permissions: {
      type: string; // enum defined by ERCs
      data: Record<string, any>;
    }[];
  };

 export type PermissionResponse = PermissionRequest & {
    context: Hex;
    accountMeta?: {
      factory: `0x${string}`;
      factoryData: `0x${string}`;
    };
    signerMeta?: {
      // 7679 userOp building
      userOpBuilder?: `0x${string}`;
      // 7710 delegation
      delegationManager?: `0x${string}`;
    };
  };