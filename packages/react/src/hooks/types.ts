import type { UseMutationOptions } from "@tanstack/react-query";

export type MutationOptionsWithoutMutationFn = Omit<
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    UseMutationOptions<any, any, any, any>,
    "mutationFn" | "mutationKey"
>;
