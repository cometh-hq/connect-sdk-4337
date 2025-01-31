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
import { useContext } from "react";
import { ConnectContext } from "@/providers";

export type UseSessionKeyClientReturn = QueryResultType<SmartSessionClient>;

export function useSessionKeyClient({
  sessionData,
  privateKey,
}: {
  sessionData: GrantPermissionResponse;
  privateKey: Hex;
}): UseSessionKeyClientReturn {
  const { smartAccountClient } = useSmartAccount();
  const { data: sessionKeySigner } = useSessionKeySigner({
    sessionData,
    privateKey,
  });
  const context = useContext(ConnectContext);

  if (context === undefined) {
    throw new Error(
      "useSessionKeyClient must be used within a ConnectProvider"
    );
  }

  const query = useQuery<unknown, unknown, SmartSessionClient, unknown[]>({
    queryKey: ["session-key-get-client", sessionKeySigner, smartAccountClient],
    queryFn: async (): Promise<SmartSessionClient> => {
      if (!smartAccountClient) throw new Error("No smart account found");
      if (!sessionKeySigner) throw new Error("No signer found");
      if (!context.apikey) throw new Error("No apikey found");

      return createSessionSmartAccountClient(
        context.apikey,
        smartAccountClient,
        sessionKeySigner
      );
    },
  });

  return query;
}
