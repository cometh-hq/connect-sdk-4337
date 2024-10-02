import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { deepHexlify, waitForUserOperationReceipt } from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import {
    type Middleware,
    prepareUserOperationRequest,
} from "permissionless/actions/smartAccount";
import type { SendUserOperationParameters } from "permissionless/actions/smartAccount/sendUserOperation";

import type {
    EntryPoint,
    GetAccountParameter,
    GetEntryPointVersion,
    Prettify,
    UserOperation,
} from "permissionless/types";
import type { UserOperationWithBigIntAsHex } from "permissionless/types/userOperation";

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import type { BundlerRpcSchema } from "permissionless/types/bundler";
import type { Address, Chain, Client, Hash, Hex, Transport } from "viem";
import { getAction } from "viem/utils";

export type SendTransactionsWithPaymasterParameters<
    entryPoint extends EntryPoint,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined,
> = {
    transactions: { to: Address; value: bigint; data: Hex }[];
} & GetAccountParameter<entryPoint, TAccount> &
    Middleware<entryPoint> & {
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
        nonce?: bigint;
    };

export async function sendTransactionsWithSessionKey<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined =
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<
        SendTransactionsWithPaymasterParameters<entryPoint, TAccount>
    >
): Promise<Hash> {
    const {
        transactions,
        middleware,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } = args;

    const account = client.account as SafeSmartAccount<
        entryPoint,
        TTransport,
        TChain
    >;

    const smartAccountAddress = client.account?.address;

    if (!smartAccountAddress) throw new Error("No smart account address found");

    const callData = await account.encodeCallData(
        transactions.map(
            ({
                to,
                value,
                data,
            }: { to: Address; value: bigint; data: Hex }) => {
                if (!to) throw new Error("Missing to address");
                return {
                    to,
                    value: value || BigInt(0),
                    data: data || "0x",
                };
            }
        )
    );

    const userOperation = await getAction(
        client,
        prepareUserOperationRequest<entryPoint, TTransport, TChain, TAccount>,
        "prepareUserOperationRequest"
    )({
        userOperation: {
            sender: account.address,
            maxFeePerGas: maxFeePerGas || BigInt(0),
            maxPriorityFeePerGas: maxPriorityFeePerGas || BigInt(0),
            callData: callData,
            nonce: nonce,
        },
        account: account,
        middleware,
    } as SendUserOperationParameters<entryPoint, TAccount>);

    userOperation.signature = await account.signUserOperationWithSessionKey(
        userOperation as UserOperation<GetEntryPointVersion<entryPoint>>
    );

    try {
        const userOperationHash = await (
            client as Client<
                TTransport,
                TChain,
                TAccount,
                BundlerRpcSchema<entryPoint>
            >
        ).request({
            method: "eth_sendUserOperation",
            params: [
                deepHexlify(userOperation) as UserOperationWithBigIntAsHex<
                    GetEntryPointVersion<entryPoint>
                >,
                ENTRYPOINT_ADDRESS_V07 as unknown as entryPoint,
            ],
        });

        const userOperationReceipt = await getAction(
            client,
            waitForUserOperationReceipt,
            "waitForUserOperationReceipt"
        )({
            hash: userOperationHash,
        });

        return userOperationReceipt?.receipt.transactionHash;
    } catch (err) {
        throw new Error(`Error sending user operation: ${err}`);
    }
}
