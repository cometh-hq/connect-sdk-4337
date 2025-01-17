import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    type CreateSessionDataParams,
    ERROR_MESSAGES,
    type FullCreateSessionDataParams,
    type PreparePermissionResponse,
    type Session,
    applyDefaults,
    generateSalt,
} from "@biconomy/sdk";
import {
    OWNABLE_VALIDATOR_ADDRESS,
    SMART_SESSIONS_ADDRESS,
    encodeValidationData,
    getPermissionId,
} from "@rhinestone/module-sdk";
import type {
    Address,
    Chain,
    Client,
    Hex,
    PublicClient,
    Transport,
} from "viem";
import { encodeFunctionData, toFunctionSelector } from "viem/utils";
import { SmartSessionAbi } from "../abi/smartSessionAbi";

export const ONE_YEAR_FROM_NOW_IN_SECONDS = Date.now() + 60 * 60 * 24 * 365;

/**
 * Parameters for creating sessions in a modular smart account.
 *
 * @template TModularSmartAccount - Type of the modular smart account, extending ModularSmartAccount or undefined.
 */
export type PreparePermissionParameters<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
> = {
    /** Array of session data parameters for creating multiple sessions. */
    sessionRequestedInfo: CreateSessionDataParams[];
    /** The maximum fee per gas unit the transaction is willing to pay. */
    maxFeePerGas?: bigint;
    /** The maximum priority fee per gas unit the transaction is willing to pay. */
    maxPriorityFeePerGas?: bigint;
    /** The nonce of the transaction. If not provided, it will be determined automatically. */
    nonce?: bigint;
    /** Optional public client for blockchain interactions. */
    publicClient?: PublicClient;
    /** The modular smart account to create sessions for. If not provided, the client's account will be used. */
    account?: TAccount;
};

/**
 * Generates the action data for creating sessions in the SmartSessionValidator.
 *
 * @param sessionRequestedInfo - Array of session data parameters.
 * @param client - The public client for blockchain interactions.
 * @returns A promise that resolves to the action data and permission IDs, or an Error.
 */
export const getPermissionAction = async ({
    sessionRequestedInfo,
    
}: {
    sessionRequestedInfo: FullCreateSessionDataParams[];
    client: PublicClient;
}): Promise<PreparePermissionResponse | Error> => {
    const sessions: Session[] = [];
    const permissionIds: Hex[] = [];

    console.log({ sessionRequestedInfo });

    // Start populating the session for each param provided
    for (const sessionInfo of sessionRequestedInfo) {
       

        const session = {
            //chainId: BigInt(client!.chain?.id),
            sessionValidator: OWNABLE_VALIDATOR_ADDRESS,
            sessionValidatorInitData: encodeValidationData({
              threshold: 1,
              owners: [sessionInfo.sessionKeyData]
            }),
            salt: sessionInfo.salt ?? generateSalt(),
            userOpPolicies: [],
            actions: [
                {
                    actionTarget:
                        "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F" as Address,
                    actionTargetSelector: toFunctionSelector(
                        "function count()"
                    ) as Hex,
                    actionPolicies: [
                        {
                            policy: "0x0000003111cD8e92337C100F22B7A9dbf8DEE301",
                            initData: "0x",
                        },
                    ],
                },
            ],
            erc7739Policies: {
              allowedERC7739Content: [],
              erc1271Policies: []
            }
            // permitERC4337Paymaster: true
          }

        console.log({ session });

        const permissionId = await getPermissionId({
            session: session as any,
        });
        // push permissionId to the array
        permissionIds.push(permissionId);

        // Push to sessions array
        sessions.push(session as any);
    }

    console.log({ permissionIds });
    console.log(sessions);

    const preparePermissionData = encodeFunctionData({
        abi: SmartSessionAbi,
        functionName: "enableSessions",
        args: [sessions],
    });

    console.log({ preparePermissionData });

    return {
        action: {
            target: SMART_SESSIONS_ADDRESS,
            value: BigInt(0),
            callData: preparePermissionData,
        },
        permissionIds: permissionIds,
        sessions,
    };
};

/**
 * Adds multiple sessions to the SmartSessionValidator module of a given smart account.
 *
 * This function prepares and sends a user operation to create multiple sessions
 * for the specified modular smart account. Each session can have its own policies
 * and permissions.
 *
 * @template TModularSmartAccount - Type of the modular smart account, extending ModularSmartAccount or undefined.
 * @param client - The client used to interact with the blockchain.
 * @param parameters - Parameters including the smart account, required session specific policies info, and optional gas settings.
 * @returns A promise that resolves to an object containing the user operation hash and an array of permission IDs.
 *
 * @throws {AccountNotFoundError} If the account is not found.
 * @throws {Error} If there's an error getting the enable sessions action.
 *
 * @example
 * ```typescript
 * import { preparePermission } from '@biconomy/sdk'
 *
 * const result = await preparePermission(nexusClient, {
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
export async function preparePermission<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<Transport, Chain | undefined, TAccount>,
    parameters: PreparePermissionParameters<TAccount>
): Promise<PreparePermissionResponse> {
    const {
        publicClient: publicClient_ = client.account
            ?.publicClient as PublicClient,
        account = client.account,
        sessionRequestedInfo,
    } = parameters;

    if (!account || !account.address) {
        throw new Error("Account not found");
    }

    const chainId = publicClient_?.chain?.id;

    if (!chainId) {
        throw new Error(ERROR_MESSAGES.CHAIN_NOT_FOUND);
    }

    const defaultedSessionRequestedInfo =
        sessionRequestedInfo.map(applyDefaults);

    console.log({ defaultedSessionRequestedInfo });

    const actionResponse = await getPermissionAction({
        client: publicClient_,
        sessionRequestedInfo: defaultedSessionRequestedInfo,
    });

    if (actionResponse instanceof Error) {
        throw actionResponse;
    }

    return actionResponse;
}
