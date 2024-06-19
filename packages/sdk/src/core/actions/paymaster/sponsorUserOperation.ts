import type { ComethPaymasterRpcSchema } from "@/core/clients/types";
import { deepHexlify } from "permissionless";
import type {
    EntryPoint,
    GetEntryPointVersion,
    Prettify,
} from "permissionless/types";
import type { UserOperation } from "permissionless/types/userOperation.js";
import {
    type Account,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    hexToBigInt,
} from "viem";

export type SponsorUserOperationReturnType = {
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    paymaster: Address;
    paymasterVerificationGasLimit: bigint;
    paymasterPostOpGasLimit: bigint;
    paymasterData: Hex;
};

export const sponsorUserOperation = async <
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
>(
    client: Client<
        TTransport,
        TChain,
        TAccount,
        ComethPaymasterRpcSchema<entryPoint>
    >,
    args: Prettify<{
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>;
        entryPoint: Address;
    }>
): Promise<SponsorUserOperationReturnType> => {
    const response = (await client.request({
        method: "pm_sponsorUserOperation",
        params: [deepHexlify(args.userOperation), args.entryPoint],
    })) as {
        paymasterAndData: Hex;
        preVerificationGas: Hex;
        verificationGasLimit: Hex;
        callGasLimit: Hex;
        paymaster?: never;
        paymasterVerificationGasLimit?: never;
        paymasterPostOpGasLimit?: never;
        paymasterData?: never;
    };

    return {
        callGasLimit: BigInt(response.callGasLimit),
        verificationGasLimit: BigInt(response.verificationGasLimit),
        preVerificationGas: BigInt(response.preVerificationGas),
        paymaster: response.paymaster! as Address,
        paymasterVerificationGasLimit: hexToBigInt(
            response.paymasterVerificationGasLimit!
        ),
        paymasterPostOpGasLimit: hexToBigInt(response.paymasterPostOpGasLimit!),
        paymasterData: response.paymasterData!,
    };
};
