import { useSmartAccount } from "@/hooks";
import type { Signer } from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { Hash } from "viem";
import type { MutationOptionsWithoutMutationFn } from "./types";

export type UseValidateAddDeviceProps = {
    signer: Signer;
};

export const useValidateAddDevice = (
    mutationProps?: MutationOptionsWithoutMutationFn
) => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const useValidateAddDeviceMutation = useMutation(
        {
            mutationFn: (
                variables: UseValidateAddDeviceProps
            ): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }
                const { signer } = variables;

                return smartAccountClient.validateAddDevice({ signer });
            },
            ...mutationProps,
        },
        queryClient
    );

    return useValidateAddDeviceMutation;
};
