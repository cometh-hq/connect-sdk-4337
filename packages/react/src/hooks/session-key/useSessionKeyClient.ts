import { useQuery } from "wagmi/query";
import { type GrantPermissionResponse } from "@cometh/connect-sdk-4337";
import type { QueryResultType } from "../types";
import { type Hex } from "viem";
import { useSessionKeySigner } from "./useSessionKeySigner";
import { useSmartAccount } from "../useSmartAccount";
import {
  createSessionSmartAccountClient,
  type SmartSessionClient,
} from "@/actions/createSessionSmartAccount";
import { SignerNotFoundError, SmartAccountNotFoundError } from "@/errors";

export type UseSessionKeyClientReturn = QueryResultType<SmartSessionClient>;

export function useSessionKeyClient({
  apiKey,
  sessionData,
  privateKey,
}: {
  apiKey: string;
  sessionData: GrantPermissionResponse;
  privateKey: Hex;
}): UseSessionKeyClientReturn {
  const { smartAccountClient } = useSmartAccount();
  const { data: sessionKeySigner } = useSessionKeySigner({
    sessionData,
    privateKey,
  });

  const query = useQuery<unknown, unknown, SmartSessionClient, unknown[]>({
    queryKey: ["session-key-get-client", sessionKeySigner, smartAccountClient],
    queryFn: async (): Promise<SmartSessionClient> => {
      if (!smartAccountClient) throw new SmartAccountNotFoundError();
      if (!sessionKeySigner) throw new SignerNotFoundError();

      return createSessionSmartAccountClient(
        apiKey,
        smartAccountClient,
        sessionKeySigner
      );
    },
  });

  return query;
}
