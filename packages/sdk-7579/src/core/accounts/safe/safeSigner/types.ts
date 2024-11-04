import type { Hex, LocalAccount } from "viem";

export type SafeSigner<Name extends string = string> = LocalAccount<Name> & {
    getStubSignature(): Promise<Hex>;
    signUserOperation: (parameters: any) => Promise<Hex>;
};
