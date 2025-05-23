import {
    FALLBACK_TARGET_FLAG,
    FALLBACK_TARGET_SELECTOR_FLAG_PERMITTED_TO_CALL_SMARTSESSION,
} from "@/constants";
import {
    type ActionData,
    type PolicyData,
    SMART_SESSIONS_ADDRESS,
    type Session,
    encodeValidationData,
    getPermissionId,
    getSudoPolicy,
} from "@rhinestone/module-sdk";
import {
    type Address,
    type Chain,
    ChainNotFoundError,
    type Client,
    type Hex,
    type PublicClient,
    type Transport,
} from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { encodeFunctionData } from "viem/utils";
import { SmartSessionAbi } from "../abi/smartSessionAbi";
import type {
    CreateSessionDataParams,
    FullCreateSessionDataParams,
    PreparePermissionResponse,
    ResolvedActionPolicyInfo,
} from "../types";
import {
    abiToPoliciesInfo,
    applyDefaults,
    createActionData,
    generateSalt,
} from "../utils";

export type PreparePermissionParameters<
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
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

export const getPermissionAction = async ({
    client,
    sessionRequestedInfo,
}: {
    sessionRequestedInfo: FullCreateSessionDataParams[];
    client: PublicClient;
}): Promise<PreparePermissionResponse | Error> => {
    const sessions: Session[] = [];
    const permissionIds: Hex[] = [];

    const resolvedPolicyInfo2ActionData = (
        actionPolicyInfo: ResolvedActionPolicyInfo
    ) => {
        const policyData: PolicyData[] = [];

        // create sudo policy here..
        const sudoPolicy = getSudoPolicy();
        policyData.push(sudoPolicy);

        // Create ActionData
        const actionPolicy = createActionData(
            actionPolicyInfo.contractAddress,
            actionPolicyInfo.functionSelector,
            policyData
        );

        return actionPolicy;
    };

    // Start populating the session for each param provided
    for (const sessionInfo of sessionRequestedInfo) {
        const actionPolicies: ActionData[] = [];

        if (
            !sessionInfo.actionPoliciesInfo ||
            sessionInfo.actionPoliciesInfo.length === 0
        ) {
            // If no action policies provided, use sudo action
            const session = {
                chainId: BigInt(client?.chain?.id as number),
                sessionValidator: sessionInfo.sessionValidator as Address,
                sessionValidatorInitData: encodeValidationData({
                    threshold: 1,
                    owners: [sessionInfo.sessionKeyData],
                }),
                salt: sessionInfo.salt ?? generateSalt(),
                userOpPolicies: [getSudoPolicy()],
                actions: [
                    {
                        actionTarget: FALLBACK_TARGET_FLAG,
                        actionTargetSelector:
                            FALLBACK_TARGET_SELECTOR_FLAG_PERMITTED_TO_CALL_SMARTSESSION,
                        actionPolicies: [
                            {
                                policy: getSudoPolicy().policy,
                                initData: "0x" as Hex,
                            },
                        ],
                    },
                ],
                erc7739Policies: {
                    allowedERC7739Content: [],
                    erc1271Policies: [],
                },
                permitERC4337Paymaster: true,
            };

            const permissionId = await getPermissionId({ session });
            permissionIds.push(permissionId);
            sessions.push(session);
            continue;
        }

        // Existing logic for when actionPoliciesInfo is not empty
        for (const actionPolicyInfo of sessionInfo.actionPoliciesInfo) {
            if (actionPolicyInfo.abi) {
                // Resolve the abi to multiple function selectors...
                const resolvedPolicyInfos = abiToPoliciesInfo(actionPolicyInfo);
                const actionPolicies_ = resolvedPolicyInfos.map(
                    resolvedPolicyInfo2ActionData
                );
                actionPolicies.push(...actionPolicies_);
            } else {
                const actionPolicy =
                    resolvedPolicyInfo2ActionData(actionPolicyInfo);
                actionPolicies.push(actionPolicy);
            }
        }

        const session = {
            chainId: BigInt(client?.chain?.id as number),
            sessionValidator: sessionInfo.sessionValidator as Address,
            sessionValidatorInitData: encodeValidationData({
                threshold: 1,
                owners: [sessionInfo.sessionKeyData],
            }),
            salt: sessionInfo.salt ?? generateSalt(),
            userOpPolicies: [getSudoPolicy()],
            actions: actionPolicies,
            erc7739Policies: {
                allowedERC7739Content: [],
                erc1271Policies: [],
            },
            permitERC4337Paymaster: true,
        };

        const permissionId = await getPermissionId({
            session,
        });
        // push permissionId to the array
        permissionIds.push(permissionId);

        // Push to sessions array
        sessions.push(session);
    }

    const preparePermissionData = encodeFunctionData({
        abi: SmartSessionAbi,
        functionName: "enableSessions",
        args: [sessions],
    });

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

export async function preparePermission<
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<Transport, Chain | undefined, TAccount>,
    parameters: PreparePermissionParameters<TAccount>
): Promise<PreparePermissionResponse> {
    const {
        publicClient: publicClient_ = client.account?.client as PublicClient,
        sessionRequestedInfo,
    } = parameters;

    const chainId = publicClient_?.chain?.id;

    if (!chainId) {
        throw new ChainNotFoundError();
    }

    const defaultedSessionRequestedInfo =
        sessionRequestedInfo.map(applyDefaults);

    const actionResponse = await getPermissionAction({
        client: publicClient_,
        sessionRequestedInfo: defaultedSessionRequestedInfo,
    });

    if (actionResponse instanceof Error) {
        throw actionResponse;
    }

    return actionResponse;
}
