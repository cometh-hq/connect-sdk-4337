import { useMutation } from "wagmi/query";
import {
  type GrantPermissionResponse,
  type UsePermissionParameters,
} from "@cometh/connect-sdk-4337";
import type {
  MutationOptionsWithoutMutationFn,
  QueryResultType,
} from "../types";
import { type Hash, type Hex } from "viem";
import { useSessionKeySigner } from "./useSessionKeySigner";
import { useSmartAccount } from "../useSmartAccount";
import { createSessionSmartAccountClient } from "@/actions/createSessionSmartAccount";
import { useContext } from "react";
import { ConnectContext } from "@/providers/ConnectProvider";
import { ApiKeyNotFoundError, SignerNotFoundError, NotWithinConnectProviderError, SmartAccountNotFoundError } from "@/errors";

export type SendPermissionMutate = (variables: UsePermissionParameters) => void;

export type SendPermissionMutateAsync = (
  variables: UsePermissionParameters
) => Promise<Hash>;

export type UseSendPermissionReturn = QueryResultType<Hash> & {
  sendPermission: SendPermissionMutate;
  sendPermissionAsync: SendPermissionMutateAsync;
};

export function useSendPermission({
  sessionData,
  privateKey,
  mutationProps,
}: {
  sessionData: GrantPermissionResponse;
  privateKey: Hex;
  mutationProps?: MutationOptionsWithoutMutationFn;
}): UseSendPermissionReturn {
  const context = useContext(ConnectContext);

  if (context === undefined) {
    throw new NotWithinConnectProviderError("useSendPermission");
  }

  const { smartAccountClient } = useSmartAccount();
  const { data: sessionKeySigner } = useSessionKeySigner({
    sessionData,
    privateKey,
  });

  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: [
      "session-key-send-permission",
      sessionKeySigner,
      smartAccountClient,
    ],
    mutationFn: async (args: UsePermissionParameters): Promise<Hash> => {
      if (!smartAccountClient) throw new SmartAccountNotFoundError();
      if (!sessionKeySigner) throw new SignerNotFoundError();
      if (!context.apikey) throw new ApiKeyNotFoundError();

      const sessionKeyClient = await createSessionSmartAccountClient(
        context.apikey,
        smartAccountClient,
        sessionKeySigner
      );

      const userOpHash = await sessionKeyClient.usePermission(args);

      const userOp = await sessionKeyClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      return userOp.receipt.transactionHash;
    },
    ...mutationProps,
  });

  return {
    data: result.data,
    error: result.error,
    isPending: result.isPending,
    isSuccess: result.isSuccess,
    isError: result.isError,
    sendPermission: mutate,
    sendPermissionAsync: mutateAsync,
  };
}
