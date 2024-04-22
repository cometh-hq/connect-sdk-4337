import type {
    Abi,
    Address,
    Client,
    GetContractReturnType,
    Hex,
    PublicClient,
    SignableMessage,
} from "viem";

export type GetPluginAddressParameter = { pluginAddress?: Address };

export type Plugin<TAbi extends Abi = Abi> = {
    meta: {
        name: string;
        version: string;
        addresses: Record<number, Address>;
    };
    getContract: <C extends Client>(
        client: C,
        address?: Address
    ) => GetContractReturnType<TAbi, PublicClient, Address>;
};

export type MultiOwnerSigner = {
    getDummySignature(uoHash: Hex): Hex;
    signMessage: ({ message }: { message: SignableMessage }) => Promise<Hex>;
    signUserOperationHash: (uoHash: Hex) => Promise<Hex>;
};
