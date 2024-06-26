import { type SmartAccountActions, smartAccountActions } from "permissionless";
import type {
    Middleware,
    SendTransactionWithPaymasterParameters,
} from "permissionless/actions/smartAccount";
import type { EntryPoint } from "permissionless/types";
import type { Chain, Client, Hash, Transport } from "viem";

import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    type ValidateAddDevice,
    validateAddDevice,
} from "@/core/actions/accounts/safe/owners/addDeviceActions.js";
import { sendTransactionWithSessionKey } from "@/core/actions/accounts/safe/sessionKeys/sendTransactionWithSessionKey";
import {
    type SendTransactionsWithPaymasterParameters,
    sendTransactionsWithSessionKey,
} from "@/core/actions/accounts/safe/sessionKeys/sendTransactionsWithSessionKey";
import {
    type VerifySignatureParams,
    verifySignature,
} from "@/core/actions/accounts/safe/verifySignature";

export type ComethClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined =
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined,
> = SmartAccountActions<entryPoint, TChain, TAccount> & {
    validateAddDevice: <TTransport extends Transport>(
        args: Parameters<
            typeof validateAddDevice<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Hash>;
    verifySignature: <TTransport extends Transport>(
        args: Parameters<
            typeof verifySignature<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<boolean>;
    sendTransactionWithSessionKey: <TTransport extends Transport>(
        args: Parameters<
            typeof sendTransactionWithSessionKey<
                entryPoint,
                TTransport,
                TChain,
                TAccount
            >
        >[1]
    ) => Promise<Hash>;
    sendTransactionsWithSessionKey: <TTransport extends Transport>(
        args: Parameters<
            typeof sendTransactionsWithSessionKey<
                entryPoint,
                TTransport,
                TChain,
                TAccount
            >
        >[1]
    ) => Promise<Hash>;
};

export function comethAccountClientActions<entryPoint extends EntryPoint>({
    middleware,
}: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TAccount extends
            | SafeSmartAccount<entryPoint, Transport, Chain>
            | undefined =
            | SafeSmartAccount<entryPoint, Transport, Chain>
            | undefined,
    >(
        client: Client<TTransport, TChain, TAccount>
    ): ComethClientActions<entryPoint, TChain, TAccount> => ({
        ...smartAccountActions({ middleware })(client),
        validateAddDevice: (args) =>
            validateAddDevice<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                    middleware,
                } as ValidateAddDevice<entryPoint>
            ),
        verifySignature: (args) =>
            verifySignature<entryPoint, TTransport, TChain, TAccount>(client, {
                ...args,
            } as VerifySignatureParams),
        sendTransactionWithSessionKey: (args) =>
            sendTransactionWithSessionKey<
                entryPoint,
                TTransport,
                TChain,
                TAccount
            >(client, {
                ...args,
                middleware,
            } as SendTransactionWithPaymasterParameters<
                entryPoint,
                TChain,
                TAccount
            >),
        sendTransactionsWithSessionKey: (args) =>
            sendTransactionsWithSessionKey<
                entryPoint,
                TTransport,
                TChain,
                TAccount
            >(client, {
                ...args,
                middleware,
            } as SendTransactionsWithPaymasterParameters<entryPoint, TAccount>),
    });
}
