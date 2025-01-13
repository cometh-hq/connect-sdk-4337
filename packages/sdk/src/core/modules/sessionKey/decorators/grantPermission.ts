import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    type CreateSessionDataParams,
    type GrantPermissionResponse,
    applyDefaults,
    getPermissionAction,
} from "@biconomy/sdk";
import {
    http,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    createPublicClient,
} from "viem";
import { sendUserOperation } from "viem/account-abstraction";
import { getAction } from "viem/utils";

/**
 * Parameters for creating sessions in a modular smart account.
 *
 * @template TAccount - Type of the modular smart account, extending ModularSmartAccount or undefined.
 */
export type GrantPermissionParameters = {
    /** Array of session data parameters for creating multiple sessions. */
    sessionRequestedInfo: CreateSessionDataParams[];
    /** The maximum fee per gas unit the transaction is willing to pay. */
    maxFeePerGas?: bigint;
    /** The maximum priority fee per gas unit the transaction is willing to pay. */
    maxPriorityFeePerGas?: bigint;
};

/**
 * Adds multiple sessions to the SmartSessionValidator module of a given smart account.
 *
 * This function prepares and sends a user operation to create multiple sessions
 * for the specified modular smart account. Each session can have its own policies
 * and permissions.
 *
 * @template TAccount - Type of the smart account or undefined.
 * @param client - The client used to interact with the blockchain.
 * @param parameters - Parameters including the smart account, required session specific policies info, and optional gas settings.
 * @returns A promise that resolves to an object containing the user operation hash and an array of permission IDs.
 *
 * @throws {AccountNotFoundError} If the account is not found.
 * @throws {Error} If there's an error getting the enable sessions action.
 *
 * @example
 * ```typescript
 *
 * const result = await grantPermission(client, {
 *   sessionRequestedInfo: [
 *     {
 *       sessionKeyData: '0x...',
 *       actionPoliciesInfo: [
 *         {
 *           contractAddress: '0x...',
 *           functionSelector: '0x...',
 *           rules: [...],
 *           valueLimit: 1000000000000000000n
 *         }
 *       ],
 *       sessionValidUntil: 1234567890
 *     }
 *   ]
 * });
 * console.log(result.userOpHash); // '0x...'
 * console.log(result.permissionIds); // ['0x...', '0x...']
 * ```
 *
 * @remarks
 * - Ensure that the client has sufficient gas to cover the transaction.
 * - The number of sessions created is determined by the length of the `sessionRequestedInfo` array.
 * - Each session's policies and permissions are determined by the `actionPoliciesInfo` provided.
 */
export async function grantPermission<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<Transport, Chain | undefined, TAccount>,
    parameters: GrantPermissionParameters
): Promise<GrantPermissionResponse> {
    const { sessionRequestedInfo } = parameters;

    const publicClient_ =
        client.account?.publicClient ??
        createPublicClient({
            transport: http(),
            chain: client.chain,
        });

    const chainId = publicClient_?.chain?.id;

    if (!chainId) {
        throw new Error("chainId not found");
    }

    const defaultedSessionRequestedInfo =
        sessionRequestedInfo.map(applyDefaults);

    const actionResponse = await getPermissionAction({
        chainId,
        client: publicClient_,
        sessionRequestedInfo: defaultedSessionRequestedInfo,
    });

    if ("action" in actionResponse) {
        const { action } = actionResponse;
        if (!("callData" in action)) {
            throw new Error("Error getting enable sessions action");
        }

        const userOpHash = (await getAction(
            client,
            sendUserOperation,
            "sendUserOperation"
        )({
            calls: [
                {
                    to: action.target,
                    value: BigInt(action.value.toString()),
                    data: action.callData,
                },
            ],
        })) as Hex;

        return {
            userOpHash: userOpHash,
            permissionIds: actionResponse.permissionIds,
        };
    }
    throw new Error("Error getting enable sessions action");
}
