import {
    ENTRYPOINT_ADDRESS_V07,
    type UserOperation,
    estimateUserOperationGas,
} from "permissionless";
import { getUserOperationGasPrice } from "permissionless/actions/pimlico";
import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types";
import type { Account, Chain, Client, Transport } from "viem";
import { getAction } from "viem/utils";

export type EstimateGasParams = {
    userOperation: UserOperation<"v0.7">;
};

export const estimateGas = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: EstimateGasParams
): Promise<{
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
}> => {
    const { userOperation } = args;

    const estimateGas = await getAction(
        client,
        estimateUserOperationGas<ENTRYPOINT_ADDRESS_V07_TYPE>,
        "estimateUserOperationGas"
    )({
        userOperation,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
    });

    const maxGasPriceResult = await getAction(
        client,
        getUserOperationGasPrice,
        "getUserOperationGasPrice"
    )({});

    return {
        callGasLimit: estimateGas.callGasLimit,
        verificationGasLimit: estimateGas.verificationGasLimit,
        preVerificationGas: estimateGas.preVerificationGas,
        paymasterVerificationGasLimit:
            estimateGas.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: estimateGas.paymasterPostOpGasLimit,
        maxFeePerGas: maxGasPriceResult.fast.maxFeePerGas,
        maxPriorityFeePerGas: maxGasPriceResult.fast.maxPriorityFeePerGas,
    };
};
