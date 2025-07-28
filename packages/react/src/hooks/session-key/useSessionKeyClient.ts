import {
    type SmartSessionClient,
    createSessionSmartAccountClient,
} from "@/actions/createSessionSmartAccount";
import {
    ApiKeyNotFoundError,
    SignerNotFoundError,
    SmartAccountNotFoundError,
} from "@/errors";
import { ConnectContext } from "@/providers";
import type { GrantPermissionResponse } from "@cometh/connect-sdk-4337";
import { useContext } from "react";
import type { Hex } from "viem";
import { useQuery } from "wagmi/query";
import type { QueryResultType } from "../types";
import { useSmartAccount } from "../useSmartAccount";
import { useSessionKeySigner } from "./useSessionKeySigner";

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
        queryKey: [
            "session-key-get-client",
            sessionKeySigner,
            smartAccountClient,
        ],
        queryFn: async (): Promise<SmartSessionClient> => {
            if (!smartAccountClient) throw new SmartAccountNotFoundError();
            if (!sessionKeySigner) throw new SignerNotFoundError();
            if (!context.apikey) throw new ApiKeyNotFoundError();

            return createSessionSmartAccountClient(
                context.apikey,
                smartAccountClient,
                sessionKeySigner
            );
        },
    });

    return query;
}
