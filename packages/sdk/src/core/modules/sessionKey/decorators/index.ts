import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type {
    Execution,
    GrantPermissionResponse,
    PreparePermissionResponse,
} from "@biconomy/sdk";
import type { Chain, Client, Hash, Transport } from "viem";
import {
    type GrantPermissionParameters,
    grantPermission,
} from "./grantPermission";
import {
    type IsPermissionInstalledParameters,
    isPermissionInstalled,
} from "./isPermissionInstalled";
import {
    type PreparePermissionParameters,
    preparePermission,
} from "./preparePermission";
import {
    type TrustAttestersParameters,
    trustAttesters,
} from "./trustAttesters";
import { usePermission } from "./usePermission";

/**
 * Parameters for using a smart session to execute actions.
 *
 */
export type UsePermissionParameters = {
    /** Array of executions to perform in the session. Allows for batch transactions if the session is enabled for multiple actions. */
    actions: Execution[];
    /** The maximum fee per gas unit the transaction is willing to pay. */
    maxFeePerGas?: bigint;
    /** The maximum priority fee per gas unit the transaction is willing to pay. */
    maxPriorityFeePerGas?: bigint;
};

/**
 * Defines the shape of actions available for creating smart sessions.
 *
 * @template TAccount - Type of the modular smart account, extending ModularSmartAccount or undefined.
 */
export type SmartSessionCreateActions<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
> = {
    /**
     * Creates multiple sessions for a modular smart account.
     *
     * @param args - Parameters for creating sessions.
     * @returns A promise that resolves to the creation response.
     */
    grantPermission: (
        args: GrantPermissionParameters<TAccount>
    ) => Promise<GrantPermissionResponse>;

    /**
     * Prepares permission for a modular smart account.
     *
     * @param args - Parameters for preparing permission.
     * @returns A promise that resolves to the transaction hash.
     */
    preparePermission: (
        args: PreparePermissionParameters<TAccount>
    ) => Promise<PreparePermissionResponse>;

    /**
     * Creates multiple sessions for a modular smart account.
     *
     * @param args - Parameters for creating sessions.
     * @returns A promise that resolves to the creation response.
     */
    isPermissionInstalled: (
        args: IsPermissionInstalledParameters
    ) => Promise<boolean>;

    /**
     * Trusts attesters for a modular smart account.
     *
     * @param args - Parameters for trusting attesters.
     * @returns A promise that resolves to the transaction hash.
     */
    trustAttesters: (
        args?: TrustAttestersParameters<TAccount>
    ) => Promise<Hash>;

    /**
     * Uses a session to perform an action.
     *
     * @param args - Parameters for using a session.
     * @returns A promise that resolves to the transaction hash.
     */
    usePermission: (args: UsePermissionParameters) => Promise<Hash>;
};

/**
 * Creates actions for managing smart session creation.
 *
 * @returns A function that takes a client and returns SmartSessionCreateActions.
 */
export function smartSessionActions() {
    return <
        TAccount extends ComethSafeSmartAccount | undefined =
            | ComethSafeSmartAccount
            | undefined,
    >(
        client: Client<Transport, Chain | undefined, TAccount>
    ): SmartSessionCreateActions<TAccount> => {
        return {
            grantPermission: (args) => grantPermission(client, args),
            preparePermission: (args) => preparePermission(client, args),
            isPermissionInstalled: (args) =>
                isPermissionInstalled(client, args),
            trustAttesters: () => trustAttesters(client),
            usePermission: (args) => usePermission(client, args),
        };
    };
}

export * from "./grantPermission";
export * from "./trustAttesters";
