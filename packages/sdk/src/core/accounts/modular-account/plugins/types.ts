import type {
    Abi,
    Address,
    Client,
    GetContractReturnType,
    PublicClient,
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
