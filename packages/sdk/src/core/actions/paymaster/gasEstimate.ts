import {
    http,
    type Account,
    type Chain,
    type Client,
    type Transport,
    createClient
} from "viem";
import {bundlerActions, ENTRYPOINT_ADDRESS_V07, type UserOperation} from "permissionless";
import {pimlicoBundlerActions} from "permissionless/actions/pimlico";

export const gasEstimate = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined
>(
    client: Client<TTransport, TChain, TAccount>,
    userOperation: UserOperation<"v0.7">,
    bundlerUrl?: string,
) => {

    const bundlerClient = createClient({
        transport: http(bundlerUrl),
        chain: client.chain as Chain,
    })
        .extend(bundlerActions(ENTRYPOINT_ADDRESS_V07))
        .extend(pimlicoBundlerActions(ENTRYPOINT_ADDRESS_V07))


    const gasEstimate = await bundlerClient.estimateUserOperationGas({
        userOperation: userOperation
    })

    const maxGasPriceResult = await bundlerClient.getUserOperationGasPrice()

    return {
        callGasLimit: gasEstimate.callGasLimit,
        verificationGasLimit: gasEstimate.verificationGasLimit,
        preVerificationGas: gasEstimate.preVerificationGas,
        paymasterVerificationGasLimit: gasEstimate.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: gasEstimate.paymasterPostOpGasLimit,
        maxFeePerGas: maxGasPriceResult.fast.maxFeePerGas,
        maxPriorityFeePerGas: maxGasPriceResult.fast.maxPriorityFeePerGas,
    }
}

