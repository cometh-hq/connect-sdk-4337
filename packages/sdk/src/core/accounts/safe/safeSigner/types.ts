import type { UserOperation } from "permissionless";
import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    GetEntryPointVersion,
} from "permissionless/_types/types";
import type { Hex, LocalAccount } from "viem";

export type SafeSigner<
    Name extends string = string,
    entryPoint extends
        ENTRYPOINT_ADDRESS_V07_TYPE = ENTRYPOINT_ADDRESS_V07_TYPE,
> = LocalAccount<Name> & {
    getDummySignature(
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    ): Promise<Hex>;
    signUserOperation: (
        userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
    ) => Promise<Hex>;
};
