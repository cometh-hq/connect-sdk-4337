import {
  erc7579Actions,
  smartSessionActions,
  toSmartSessionsSigner,
  type GrantPermissionResponse,
  type SafeSigner,
} from "@cometh/connect-sdk-4337";
import { useQuery } from "wagmi/query";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { QueryResultType } from "../types";
import { useSmartAccount } from "../useSmartAccount";
import { SmartAccountNotFoundError } from "@/errors";

export type UseSessionKeySignerReturn = QueryResultType<
  SafeSigner<"safeSmartSessionsSigner">
>;

export function useSessionKeySigner({
  sessionData,
  privateKey,
}: {
  sessionData: GrantPermissionResponse;
  privateKey: Hex;
}): UseSessionKeySignerReturn {
  const { smartAccountClient } = useSmartAccount();

  const query = useQuery<
    unknown,
    unknown,
    SafeSigner<"safeSmartSessionsSigner">,
    unknown[]
  >({
    queryKey: ["session-key-signer", smartAccountClient],
    queryFn: async (): Promise<SafeSigner<"safeSmartSessionsSigner">> => {
      if (!smartAccountClient) throw new SmartAccountNotFoundError();

      const safe7559Account = smartAccountClient
        .extend(smartSessionActions())
        .extend(erc7579Actions());

      return toSmartSessionsSigner(safe7559Account, {
        moduleData: {
          permissionIds: sessionData.permissionIds,
          action: sessionData.action,
          mode: "0x00",
          sessions: sessionData.sessions,
        },
        signer: privateKeyToAccount(privateKey),
      });
    },
    enabled: !!smartAccountClient,
  });

  return query;
}
