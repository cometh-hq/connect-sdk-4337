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
    //hexToBigInt,
    encodePacked,
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
        paymasterAndData: never;
        preVerificationGas: Hex;
        verificationGasLimit: Hex;
        callGasLimit: Hex;
        paymaster?: Address;
        paymasterVerificationGasLimit?: Hex;
        paymasterPostOpGasLimit?: Hex;
        paymasterData?: Hex;
    };

    return {
        callGasLimit: BigInt(response.callGasLimit),
        verificationGasLimit: BigInt(response.verificationGasLimit),
        preVerificationGas: BigInt(response.preVerificationGas) ,
        paymaster: response.paymaster as Address,
        paymasterVerificationGasLimit: BigInt(
            response.paymasterVerificationGasLimit as Hex
        ),
        paymasterPostOpGasLimit: BigInt(
            response.paymasterPostOpGasLimit as Hex
        ),
        paymasterData: encodePacked(
            ["address", "uint128", "uint128", "bytes"],
            [
                response.paymaster as Address,
                BigInt(response.paymasterVerificationGasLimit as Hex),
                BigInt(response.paymasterPostOpGasLimit as Hex),
                response.paymasterData as Hex,
            ]
        ) as Hex,
    };
};
