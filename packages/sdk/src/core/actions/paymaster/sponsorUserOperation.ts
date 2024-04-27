import type { UserOperation } from "@/core/types";
import { deepHexlify } from "permissionless";
import type { Prettify } from "permissionless/types";
import {
    type Account,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concat,
    encodeAbiParameters,
    parseAbiParameters,
} from "viem";

export type SponsorUserOperationReturnType = Pick<
    UserOperation,
    | "callGasLimit"
    | "verificationGasLimit"
    | "preVerificationGas"
    | "paymasterAndData"
>;

export const sponsorUserOperation = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
>(
    client: Client<TTransport, TChain, TAccount, any>,
    args: Prettify<{
        userOperation: UserOperation;
        entryPoint: Address;
    }>
): Promise<SponsorUserOperationReturnType> => {
    const validAfter = "0x0000000000001234";
    const validUntil = "0x00000000deadbeef";
    const paymasterAddress = "0x6f010FB33E6dce2789c714b19c385035122e664E";

    const dummyPaymasterData = concat([
        paymasterAddress,
        encodeAbiParameters(parseAbiParameters("uint48, uint48"), [
            +validUntil,
            +validAfter,
        ]),
        ("0x" + "00".repeat(65)) as `0x${string}`,
    ]);

    console.log(args.userOperation);

    /*    const gasParameters = await getAction(client, estimateUserOperationGas)(
        {
            userOperation:deepHexlify(args.userOperation),
            entryPoint: args.entryPoint
        } as {
            userOperation: any
            entryPoint: any
        }
    )

    console.log("gasParameters", gasParameters) */

    const userOperation = {
        ...args.userOperation,
        callGasLimit: 201853n,
        // hardcode verificationGasLimit as bundler struggles with p256 verifcation estimate
        verificationGasLimit: 2000000n,
        preVerificationGas: 120000n,
        paymasterAndData: dummyPaymasterData,
    };

    console.log("userOperation", userOperation);

    const response = await client.request({
        method: "pm_sponsorUserOperation",
        params: [
            deepHexlify(userOperation),
            validUntil,
            validAfter,
            args.entryPoint,
        ],
    });

    console.log("response", response);

    const responseV06 = response as {
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
        paymasterAndData: responseV06.paymasterAndData,
        preVerificationGas: BigInt(responseV06.preVerificationGas),
        verificationGasLimit: BigInt(responseV06.verificationGasLimit),
        callGasLimit: BigInt(responseV06.callGasLimit),
    };
};
