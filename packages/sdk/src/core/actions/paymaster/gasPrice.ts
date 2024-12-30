import {
    http,
    type Account,
    type Chain,
    type Client,
    type PublicClient,
    type Transport,
    createPublicClient,
} from "viem";

export const gasPrice = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
>(
    client: Client<TTransport, TChain, TAccount, undefined>,
    publicClient?: PublicClient
) => {
    const rpcClient =
        publicClient ??
        createPublicClient({
            chain: client.chain as Chain,
            transport: http(),
        });

    const { maxFeePerGas } = (await rpcClient.estimateFeesPerGas()) as {
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
    };

    return {
        maxFeePerGas: maxFeePerGas * 3n,
        maxPriorityFeePerGas: maxFeePerGas * 2n,
    };
};
