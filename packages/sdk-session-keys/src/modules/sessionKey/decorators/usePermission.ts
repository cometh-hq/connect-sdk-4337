import { hardcodeVerificationGasLimit7579 } from "@/constants";
import type { ComethSafeSmartAccount } from "@cometh/connect-sdk-4337";
import {
    encodeValidatorNonce,
    getAccount,
    getSmartSessionsValidator,
} from "@rhinestone/module-sdk";
import { getAccountNonce } from "permissionless/actions";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    createPublicClient,
} from "viem";
import {
    entryPoint07Address,
    sendUserOperation,
} from "viem/account-abstraction";
import { getAction } from "viem/utils";
import type { Execution } from "../types";

export type UsePermissionParameters<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
> = {
    /** Array of executions to perform in the session. Allows for batch transactions if the session is enabled for multiple actions. */
    actions: Execution[];
    /** The maximum fee per gas unit the transaction is willing to pay. */
    maxFeePerGas?: bigint;
    /** The maximum priority fee per gas unit the transaction is willing to pay. */
    maxPriorityFeePerGas?: bigint;
    /** The nonce of the transaction. If not provided, it will be determined automatically. */
    nonce?: bigint;
    /** The modular smart account to use for the session. If not provided, the client's account will be used. */
    account?: TAccount;

    verificationGasLimit?: bigint;
};

export async function usePermission<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<Transport, Chain | undefined, TAccount>,
    parameters: UsePermissionParameters<TAccount>
): Promise<Hex> {
    const { maxFeePerGas, maxPriorityFeePerGas, actions } = parameters;

    const smartSessions = getSmartSessionsValidator({});

    const publicClient =
        client.account?.publicClient ??
        createPublicClient({
            chain: client?.chain,
            transport: http(),
        });

    const nonce = await getAccountNonce(publicClient, {
        address: client?.account?.address as Address,
        entryPointAddress: entryPoint07Address,
        key: encodeValidatorNonce({
            account: getAccount({
                address: client?.account?.address as Address,
                type: "safe",
            }),
            validator: smartSessions,
        }),
    });

    return await getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        calls: actions.map((call) => ({
            to: call.target,
            value: BigInt(call.value ? call.value.toString() : 0),
            data: call.callData,
        })),
        nonce,
        verificationGasLimit: hardcodeVerificationGasLimit7579,
        maxFeePerGas,
        maxPriorityFeePerGas,
    });
}
