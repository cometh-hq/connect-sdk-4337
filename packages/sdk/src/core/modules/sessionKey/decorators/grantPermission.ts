import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type {
    Call,
    CreateSessionDataParams,
    GrantPermissionResponse,
} from "@biconomy/sdk";
import type { Chain, Client, Hex, PublicClient, Transport } from "viem";
import { sendUserOperation } from "viem/account-abstraction";
import { getAction } from "viem/utils";
import { preparePermission } from "./preparePermission";

export type GrantPermissionParameters<
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
    /** Optional attesters to trust. */
    attesters?: Hex[];
    /** Additional calls to be included in the user operation. */
    calls?: Call[];
};

export async function grantPermission<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<Transport, Chain | undefined, TAccount>,
    parameters: GrantPermissionParameters<TAccount>
): Promise<GrantPermissionResponse> {
    const { calls: calls_ } = parameters;

    const preparedPermission = await getAction(
        client,
        preparePermission,
        "preparePermission"
    )(parameters);

    const userOpHash = await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        calls: [
            {
                to: preparedPermission.action.target,
                data: preparedPermission.action.callData,
                value: BigInt(0),
            },
            ...(calls_ || []),
        ],
        verificationGasLimit: 1000000n,
    });

    return {
        userOpHash,
        ...preparedPermission,
    };
}
