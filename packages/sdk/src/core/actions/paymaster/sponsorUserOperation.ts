import type { ComethPaymasterRpcSchema } from "@/core/clients/types";
import { deepHexlify } from "permissionless";
import type { BundlerRpcSchema } from "permissionless/_types/types/bundler";
import type {
    EntryPoint,
    GetEntryPointVersion,
    Prettify,
} from "permissionless/types";
import type { UserOperation } from "permissionless/types/userOperation.js";
import {
    http,
    type Account,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concat,
    createClient,
    encodeAbiParameters,
    hexToBigInt,
    parseAbiParameters,
    slice,
    zeroAddress,
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
        bundlerUrl: string;
    }>
): Promise<SponsorUserOperationReturnType> => {
    const dummyPaymasterData = concat([
        zeroAddress,
        encodeAbiParameters(
            parseAbiParameters("uint48, uint48"),
            [+0x0000000000000000, +0x0000000000000000]
        ),
        `0x${"00".repeat(65)}` as `0x${string}`,
    ]);

    const bundlerClient = createClient({
        transport: http(args.bundlerUrl),
        type: "smartAccountClient",
    }) as Client<TTransport, TChain, TAccount, BundlerRpcSchema<entryPoint>>;

    const gasParameters = (await bundlerClient.request({
        method: "eth_estimateUserOperationGas",
        params: [
            deepHexlify(args.userOperation),
            args.entryPoint as entryPoint,
        ],
    })) as {
        callGasLimit: Hex;
        verificationGasLimit: Hex;
        preVerificationGas: Hex;
    };

    const userOperation = {
        ...args.userOperation,
        callGasLimit: BigInt(gasParameters.callGasLimit),
        // Add margin for verificationGasLimit as bundler won't estimate the entire validationUserOp and executeUserOp
        verificationGasLimit:
            BigInt(gasParameters.verificationGasLimit) + 500000n,
        preVerificationGas: BigInt(gasParameters.preVerificationGas),
        paymasterAndData: dummyPaymasterData,
    };

    const response = (await client.request({
        method: "pm_sponsorUserOperation",
        params: [deepHexlify(userOperation), args.entryPoint],
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

    console.log({ response });

    /* const responseV06 = response as {
        paymasterAndData: Hex;
        preVerificationGas: Hex;
        verificationGasLimit: Hex;
        callGasLimit: Hex;
        paymaster?: never;
        paymasterVerificationGasLimit?: never;
        paymasterPostOpGasLimit?: never;
        paymasterData?: never;
    }; */

    const paymasterFields = {
        paymaster: "0x6f010FB33E6dce2789c714b19c385035122e664E" as Address,
        paymasterVerificationGasLimit: hexToBigInt(
            slice(response.paymasterAndData, 20, 36)
        ),
        paymasterPostOpGasLimit: hexToBigInt(
            slice(response.paymasterAndData, 36, 52)
        ),
        paymasterData: slice(response.paymasterAndData, 52),
    };

    return {
        callGasLimit: BigInt(response.callGasLimit),
        verificationGasLimit: BigInt(response.verificationGasLimit),
        preVerificationGas: BigInt(response.preVerificationGas),
        ...paymasterFields,
    };
};
