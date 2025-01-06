import type { Account, Chain, Client, Transport } from "viem";
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
    const estimateGas = await getAction(
        client,
        estimateUserOperationGas,
        "estimateUserOperationGas"
    )({
        ...args,
    });

    const maxGasPriceResult = await getAction(
        client,
        estimateFeesPerGas,
        "estimateFeesPerGas"
    )({
        chain: client.chain,
        type: "eip1559",
    });

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
