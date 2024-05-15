import type {
    EntryPoint,
    GetEntryPointVersion,
} from "permissionless/_types/types";
import type { UserOperationWithBigIntAsHex } from "permissionless/types/userOperation";
import type { Address, Hex } from "viem";

/**
 * RPC interface that's used for the cometh paymaster communication
 */
export type ComethPaymasterRpcSchema<entryPoint extends EntryPoint> = [
    {
        Method: "pm_sponsorUserOperation";
        Parameters: [
            userOperation: UserOperationWithBigIntAsHex<
                GetEntryPointVersion<entryPoint>
            >,
            EntryPoint: Address,
        ];
        ReturnType: {
            callGasLimit: Hex;
            verificationGasLimit: Hex;
            preVerificationGas: Hex;
        };
    },
];
