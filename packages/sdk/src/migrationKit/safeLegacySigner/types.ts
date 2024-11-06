import type { LocalAccount } from "viem";

export type SafeSigner<Name extends string = string> = LocalAccount<Name>;
