import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    type CreateSessionDataParams,
    ERROR_MESSAGES,
    type FullCreateSessionDataParams,
    type PreparePermissionResponse,
    type ResolvedActionPolicyInfo,
    type Session,
    abiToPoliciesInfo,
    applyDefaults,
    createActionData,
    generateSalt,
} from "@biconomy/sdk";
import {
    type ActionData,
    type PolicyData,
    SMART_SESSIONS_ADDRESS,
    encodeValidationData,
    getPermissionId,
    getSudoPolicy,
} from "@rhinestone/module-sdk";
import type {
    Address,
    Chain,
    Client,
    Hex,
    PublicClient,
    Transport,
} from "viem";
import { encodeFunctionData } from "viem/utils";
import { SmartSessionAbi } from "../abi/smartSessionAbi";

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

        for (const actionPolicyInfo of sessionInfo.actionPoliciesInfo ?? []) {
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
        sessionRequestedInfo,
    } = parameters;

    const chainId = publicClient_?.chain?.id;

    if (!chainId) {
        throw new Error(ERROR_MESSAGES.CHAIN_NOT_FOUND);
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
