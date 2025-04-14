import type { Hex, LocalAccount, UnionPartialBy } from "viem";
import type { UserOperation } from "viem/account-abstraction";

export type SafeSigner<Name extends string = string> = LocalAccount<Name> & {
    getStubSignature(): Promise<Hex>;
    signUserOperation: (
        parameters: UnionPartialBy<UserOperation, "sender"> & {
            chainId?: number | undefined;
        }
    ) => Promise<Hex>;
};
