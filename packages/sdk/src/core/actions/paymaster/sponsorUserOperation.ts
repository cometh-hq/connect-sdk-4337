import type { ComethPaymasterRpcSchema } from "@/core/clients/types";
import { deepHexlify } from "permissionless";
import type {
    Account,
    Address,
    Chain,
    Client,
    Hex,
    Prettify,
    Transport,
} from "viem";
import type { UserOperation } from "viem/account-abstraction";
import { entryPoint07Address } from "viem/account-abstraction";

export type SponsorUserOperationReturnType = {
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    paymaster?: Address;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
    paymasterData?: Hex;
};

export const sponsorUserOperation = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
>(
    client: Client<TTransport, TChain, TAccount, ComethPaymasterRpcSchema>,
    args: Prettify<{
        userOperation: UserOperation<"0.7">;
    }>
): Promise<SponsorUserOperationReturnType> => {
    const response = (await client.request({
        method: "pm_sponsorUserOperation",
        params: [deepHexlify(args.userOperation), entryPoint07Address],
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

    const hasPaymaster = response.paymasterVerificationGasLimit !== "0x";

    return {
        callGasLimit: BigInt(response.callGasLimit),
        verificationGasLimit: BigInt(response.verificationGasLimit),
        preVerificationGas: BigInt(response.preVerificationGas),
        paymaster: hasPaymaster ? response.paymaster : undefined,
        paymasterVerificationGasLimit: hasPaymaster
            ? BigInt(response.paymasterVerificationGasLimit as Hex)
            : undefined,
        paymasterPostOpGasLimit: hasPaymaster
            ? BigInt(response.paymasterPostOpGasLimit as Hex)
            : undefined,
        paymasterData: hasPaymaster ? response.paymasterData : undefined,
    };
};
