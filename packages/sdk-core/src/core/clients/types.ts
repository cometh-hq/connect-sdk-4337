import type { Address, Hex } from "viem";
import type { UserOperation } from "viem/account-abstraction";

/**
 * RPC interface that's used for the cometh paymaster communication
 */
export type ComethPaymasterRpcSchema = [
    {
        Method: "pm_sponsorUserOperation";
        Parameters: [userOperation: UserOperation<"0.7">, EntryPoint: Address];
        ReturnType: {
            callGasLimit: Hex;
            verificationGasLimit: Hex;
            preVerificationGas: Hex;
            paymasterPostOpGasLimit: Hex;
            paymasterVerificationGasLimit: Hex;
        };
    },
];
