import type { Address, Hex, LocalAccount, UnionPartialBy } from "viem";
import type { UserOperation } from "viem/account-abstraction";

export type SafeSigner<Name extends string = string> = LocalAccount<Name> & {
    smartAccountAddress: Address;
    getStubSignature(): Promise<Hex>;
    signUserOperation: (
        parameters: UnionPartialBy<UserOperation, "sender"> & {
            chainId?: number | undefined;
        }
    ) => Promise<Hex>;
};
