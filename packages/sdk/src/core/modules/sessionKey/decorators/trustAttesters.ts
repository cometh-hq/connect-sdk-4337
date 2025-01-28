import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    RHINESTONE_ATTESTER_ADDRESS,
    getTrustAttestersAction,
} from "@rhinestone/module-sdk";
import type { Chain, Client, Hex, Transport } from "viem";
import { sendUserOperation } from "viem/account-abstraction";
import { getAction } from "viem/utils";

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

export async function trustAttesters<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(client: Client<Transport, Chain | undefined, TAccount>): Promise<Hex> {
    const trustAttestersAction = getTrustAttestersAction({
        threshold: 1,
        attesters: [
            RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
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
