import {
    LAUNCHPAD_ADDRESS,
    SAFE_7579_ADDRESS,
    hardcodeVerificationGasLimit7579,
} from "@/constants";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { is7579Installed } from "@/core/actions/accounts/7579/is7579Installed";

import type { CreateSessionDataParams, GrantPermissionResponse } from "@/index";
import {
    RHINESTONE_ATTESTER_ADDRESS,
    getSmartSessionsValidator,
} from "@rhinestone/module-sdk";
import type { Chain, Client, Hex, PublicClient, Transport } from "viem";
import { sendUserOperation } from "viem/account-abstraction";
import { encodeFunctionData, getAction, parseAbi } from "viem/utils";
import type { Call } from "../types";
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
    const preparedPermission = await getAction(
        client,
        preparePermission,
        "preparePermission"
    )(parameters);

    const calls = [
        {
            to: preparedPermission.action.target,
            data: preparedPermission.action.callData,
            value: BigInt(0),
        },
    ];

    const is7579FallbackSet = await getAction(
        client,
        is7579Installed,
        "is7579Installed"
    )(client);

    if (!is7579FallbackSet) {
        const smartSessions = getSmartSessionsValidator({});

        calls.unshift({
            to: LAUNCHPAD_ADDRESS,
            data: encodeFunctionData({
                abi: parseAbi([
                    "struct ModuleInit {address module;bytes initData;}",
                    "function addSafe7579(address safe7579,ModuleInit[] calldata validators,ModuleInit[] calldata executors,ModuleInit[] calldata fallbacks, ModuleInit[] calldata hooks,address[] calldata attesters,uint8 threshold) external",
                ]),
                functionName: "addSafe7579",
                args: [
                    SAFE_7579_ADDRESS,
                    [
                        {
                            module: smartSessions.address,
                            initData: smartSessions.initData,
                        },
                    ],
                    [],
                    [],
                    [],
                    [RHINESTONE_ATTESTER_ADDRESS],
                    1,
                ],
            }),
            value: BigInt(0),
        });
    }

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
        ...preparedPermission,
    };
}
