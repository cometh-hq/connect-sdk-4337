import type { UseMutationOptions } from "@tanstack/react-query";
import type { Address, Hash, Hex } from "viem";

export type MutationOptionsWithoutMutationFn = Omit<
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    UseMutationOptions<any, any, any, any>,
    "mutationFn" | "mutationKey"
>;

export type Transaction = {
    to: Address;
    value: bigint;
    data: Hex;
};

export type QueryResultType = {
    data?: Hash;
    error: unknown;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
};
