import { createPublicClient, http, type Account, type Chain, type Client, type Transport } from "viem";
import {
    type EstimateUserOperationGasParameters,
    estimateUserOperationGas,
} from "viem/account-abstraction";
import { estimateFeesPerGas } from "viem/actions";
import { getAction } from "viem/utils";

export const estimateGas = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: EstimateUserOperationGasParameters
): Promise<{
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
}> => {

    const publicClient = createPublicClient({
        chain: client.chain,
        transport: http(),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },

    });
    const maxGasPriceResult = await getAction(
        publicClient,
        estimateFeesPerGas,
        "estimateFeesPerGas"
    )({
        chain: client.chain,
        type: "eip1559",
    });

    console.log({ maxGasPriceResult })

    console.log({ args })
    const estimateGas = await getAction(
        client,
        estimateUserOperationGas,
        "estimateUserOperationGas"
    )({
        ...args,
    });

    console.log({ estimateGas })




    return {
        callGasLimit: estimateGas.callGasLimit,
        verificationGasLimit: estimateGas.verificationGasLimit,
        preVerificationGas: estimateGas.preVerificationGas,
        paymasterVerificationGasLimit:
            estimateGas.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: estimateGas.paymasterPostOpGasLimit,
        maxFeePerGas: maxGasPriceResult.maxFeePerGas,
        maxPriorityFeePerGas: maxGasPriceResult.maxPriorityFeePerGas,
    };
};
