import { SmartAccountNotFoundError } from "@/errors";
import {
    type ComethSafeSmartAccount,
    type GrantPermissionParameters,
    type GrantPermissionResponse,
    erc7579Actions,
    smartSessionActions,
} from "@cometh/connect-sdk-4337";
import type { Hash } from "viem";
import { useMutation } from "wagmi/query";
import type {
    MutationOptionsWithoutMutationFn,
    QueryResultType,
} from "../types";
import { useSmartAccount } from "../useSmartAccount";

export type GrantPermissionMutate = (
    variables: GrantPermissionParameters<ComethSafeSmartAccount>
) => void;

export type GrantPermissionMutateAsync = (
    variables: GrantPermissionParameters<ComethSafeSmartAccount>
) => Promise<GrantPermissionMutateResponse>;

export type GrantPermissionMutateResponse = {
    txHash: Hash;
    createSessionsResponse: GrantPermissionResponse;
};

export type UseGrantPermissionReturn =
    QueryResultType<GrantPermissionMutateResponse> & {
        grantPermission: GrantPermissionMutate;
        grantPermissionAsync: GrantPermissionMutateAsync;
    };

export function useGrantPermission(
    mutationProps?: MutationOptionsWithoutMutationFn
): UseGrantPermissionReturn {
    const { smartAccountClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation({
        mutationKey: ["session-key-grant-permission", smartAccountClient],
        mutationFn: async (
            args: GrantPermissionParameters<ComethSafeSmartAccount>
        ): Promise<GrantPermissionMutateResponse> => {
            if (!smartAccountClient) throw new SmartAccountNotFoundError();

            const safe7559Account = smartAccountClient
                .extend(smartSessionActions())
                .extend(erc7579Actions());

            const createSessionsResponse =
                await safe7559Account.grantPermission(args);

            const response = await safe7559Account.waitForUserOperationReceipt({
                hash: createSessionsResponse.userOpHash,
            });

            return {
                txHash: response.receipt.transactionHash,
                createSessionsResponse,
            };
        },
        ...mutationProps,
    });

    return {
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        grantPermission: mutate,
        grantPermissionAsync: mutateAsync,
    };
}
