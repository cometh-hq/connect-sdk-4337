import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    MOCK_ATTESTER_ADDRESS,
    RHINESTONE_ATTESTER_ADDRESS,
    getTrustAttestersAction,
} from "@rhinestone/module-sdk";
import type { Chain, Client, Hex, Transport } from "viem";
import { sendUserOperation } from "viem/account-abstraction";
import { getAction } from "viem/utils";

/**
 * Parameters for trusting attesters in a smart session validator.
 *
 * @template TAccount - Type of the modular smart account, extending ModularSmartAccount or undefined.
 */
export type TrustAttestersParameters<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
> = {
    /** The addresses of the attesters to be trusted. */
    attesters?: Hex[];
    /** The address of the registry contract. */
    registryAddress?: Hex;
    /** The maximum fee per gas unit the transaction is willing to pay. */
    maxFeePerGas?: bigint;
    /** The maximum priority fee per gas unit the transaction is willing to pay. */
    maxPriorityFeePerGas?: bigint;
    /** The nonce of the transaction. If not provided, it will be determined automatically. */
    nonce?: bigint;
    /** The smart account to use for trusting attesters. If not provided, the client's account will be used. */
    account?: TAccount;
    /** The threshold of the attesters to be trusted. */
    threshold?: number;
};

/**
 * Trusts attesters for the smart session validator.
 *
 * This function prepares and sends a user operation to trust specified attesters
 * in the smart session validator's registry.
 *
 * @template TAccount - Type of the smart account, extending ModularSmartAccount or undefined.
 * @param client - The client used to interact with the blockchain.
 * @param parameters - Parameters including the attesters to trust, registry address, and optional gas settings.
 * @returns A promise that resolves to the hash of the sent user operation.
 *
 * @throws {AccountNotFoundError} If no account is provided and the client doesn't have an associated account.
 *
 * @example
 * ```typescript
 * const result = await trustAttesters(nexusClient, {
 *   attesters: ['0x1234...', '0x5678...'],
 *   registryAddress: '0xabcd...',
 *   maxFeePerGas: 1000000000n
 * });
 * console.log(`Transaction hash: ${result}`);
 * ```
 *
 * @remarks
 * - Ensure that the client has sufficient gas to cover the transaction.
 * - The registry address should be the address of the contract managing trusted attesters.
 */
export async function trustAttesters<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(client: Client<Transport, Chain | undefined, TAccount>): Promise<Hex> {
    const trustAttestersAction = getTrustAttestersAction({
        threshold: 1,
        attesters: [
            RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
            MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
        ],
    });

    return getAction(
        client,
        sendUserOperation,
        "sendUserOperation"
    )({
        calls: [
            {
                to: trustAttestersAction.target,
                value: BigInt(0),
                data: trustAttestersAction.data,
            },
        ],
    });
}
