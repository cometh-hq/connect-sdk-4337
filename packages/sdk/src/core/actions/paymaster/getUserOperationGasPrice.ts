import {
    http,
    type Account,
    type Chain,
    type Client,
    type Transport,
    createPublicClient,
} from "viem";

export const getUserOperationGasPrice = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
>(
    client: Client<TTransport, TChain, TAccount, undefined>,
    rpcUrl?: string
) => {
    const publicClient = createPublicClient({
        chain: client.chain as Chain,
        transport: http(rpcUrl),
    });

    const { maxFeePerGas } = (await publicClient.estimateFeesPerGas()) as {
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
    };

    return {
        maxFeePerGas: maxFeePerGas * 2n,
        maxPriorityFeePerGas: maxFeePerGas * 2n,
    };
};