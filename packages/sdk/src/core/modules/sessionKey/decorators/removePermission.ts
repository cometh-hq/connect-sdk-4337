import { hardcodeVerificationGasLimit7579 } from "@/constants";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";

import {
    type Chain,
    ChainNotFoundError,
    type Client,
    type Hex,
    type PublicClient,
    type Transport,
    encodeFunctionData,
} from "viem";
import { sendUserOperation } from "viem/account-abstraction";
import { getAction } from "viem/utils";
import type { RemovePermissionResponse } from "../types";

import { SMART_SESSIONS_ADDRESS } from "@rhinestone/module-sdk";
import { SmartSessionAbi } from "../abi/smartSessionAbi";

export type RemovePermissionParameters = {
    /** The permission ID to remove. */
    permissionId: Hex;
    /** Optional public client for blockchain interactions. */
    publicClient?: PublicClient;
};

export async function removePermission<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<Transport, Chain | undefined, TAccount>,
    parameters: RemovePermissionParameters
): Promise<RemovePermissionResponse> {
    const {
        publicClient: publicClient_ = client.account
            ?.publicClient as PublicClient,
        permissionId,
    } = parameters;

    if (!permissionId) {
        throw new Error("Permission ID is required");
    }

    const chainId = publicClient_?.chain?.id;

    if (!chainId) {
        throw new ChainNotFoundError();
    }

    const preparedRemovePermission = {
        action: {
            target: SMART_SESSIONS_ADDRESS,
            value: BigInt(0),
            callData: encodeFunctionData({
                abi: SmartSessionAbi,
                functionName: "removeSession",
                args: [permissionId],
            }),
        },
        permissionId,
    };

    if (preparedRemovePermission instanceof Error) {
        throw preparedRemovePermission;
    }

    const calls = [
        {
            to: preparedRemovePermission.action.target,
            data: preparedRemovePermission.action.callData,
            value: BigInt(0),
        },
    ];

    const userOpHash = await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        calls,
        verificationGasLimit: hardcodeVerificationGasLimit7579,
    });

    return {
        userOpHash,
        ...preparedRemovePermission,
    };
}
