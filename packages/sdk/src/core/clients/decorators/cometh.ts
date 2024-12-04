import {
    ENTRYPOINT_ADDRESS_V07,
    type EstimateUserOperationGasParameters,
    type EstimateUserOperationGasReturnType,
    type SmartAccountActions,
    estimateUserOperationGas,
    smartAccountActions,
} from "permissionless";
import type {
    Middleware,
    SendTransactionWithPaymasterParameters,
} from "permissionless/actions/smartAccount";
import type { EntryPoint, Prettify, UserOperation } from "permissionless/types";
import type { Address, Chain, Client, Hash, Hex, Transport } from "viem";

import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { estimateGas } from "@/core/actions/accounts/estimateGas";
import {
    type ValidateAddDevice,
    validateAddDevice,
} from "@/core/actions/accounts/safe/owners/addDeviceActions.js";
import {
    type CancelRecoveryRequestParams,
    cancelRecoveryRequest,
} from "@/core/actions/accounts/safe/recovery/cancelRecoveryRequest";
import {
    type AddGuardianParams,
    type DisableGuardianParams,
    type GetDelayModuleAddressParams,
    type GetGuardianAddressParams,
    type SetupCustomDelayModuleParams,
    addGuardian,
    disableGuardian,
    getDelayModuleAddress,
    getGuardianAddress,
    setupCustomDelayModule,
} from "@/core/actions/accounts/safe/recovery/customRecoveryActions";
import {
    type GetRecoveryRequestParams,
    getRecoveryRequest,
} from "@/core/actions/accounts/safe/recovery/getRecoveryRequest";
import {
    type IsRecoveryActiveParams,
    type IsRecoveryActiveReturnType,
    isRecoveryActive,
} from "@/core/actions/accounts/safe/recovery/isRecoveryActive";
import {
    type SetUpRecoveryModuleParams,
    setUpRecoveryModule,
} from "@/core/actions/accounts/safe/recovery/setUpRecoveryModule";
import { sendTransactionWithSessionKey } from "@/core/actions/accounts/safe/sessionKeys/sendTransactionWithSessionKey";
import {
    type SendTransactionsWithPaymasterParameters,
    sendTransactionsWithSessionKey,
} from "@/core/actions/accounts/safe/sessionKeys/sendTransactionsWithSessionKey";
import {
    type VerifySignatureParams,
    verifySignature,
} from "@/core/actions/accounts/safe/verifySignature";
import type { RecoveryParamsResponse } from "@/core/services/delayModuleService";
import type { StateOverrides } from "permissionless/types/bundler";

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
    setUpRecoveryModule: <TTransport extends Transport>(
        args: Parameters<
            typeof setUpRecoveryModule<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Hash>;
    cancelRecoveryRequest: <TTransport extends Transport>(
        args: Parameters<
            typeof cancelRecoveryRequest<
                entryPoint,
                TTransport,
                TChain,
                TAccount
            >
        >[1]
    ) => Promise<Hash>;
    isRecoveryActive: <TTransport extends Transport>(
        args: Parameters<
            typeof isRecoveryActive<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<IsRecoveryActiveReturnType>;
    getRecoveryRequest: <TTransport extends Transport>(
        args: Parameters<
            typeof getRecoveryRequest<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<RecoveryParamsResponse | undefined>;
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
    estimateGas: (args: { userOperation: UserOperation<"v0.7"> }) => Promise<{
        callGasLimit: bigint;
        verificationGasLimit: bigint;
        preVerificationGas: bigint;
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        paymasterVerificationGasLimit?: bigint;
        paymasterPostOpGasLimit?: bigint;
    }>;
    estimateUserOperationGas: (
        args: Prettify<
            Omit<EstimateUserOperationGasParameters<entryPoint>, "entryPoint">
        >,
        stateOverrides?: StateOverrides
    ) => Promise<Prettify<EstimateUserOperationGasReturnType<entryPoint>>>;

    getDelayModuleAddress: <TTransport extends Transport>(
        args: Parameters<
            typeof getDelayModuleAddress<
                entryPoint,
                TTransport,
                TChain,
                TAccount
            >
        >[1]
    ) => Promise<Address>;
    getGuardianAddress: <TTransport extends Transport>(
        args: Parameters<
            typeof getGuardianAddress<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Address>;
    addGuardian: <TTransport extends Transport>(
        args: Parameters<
            typeof addGuardian<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Hex>;
    disableGuardian: <TTransport extends Transport>(
        args: Parameters<
            typeof disableGuardian<entryPoint, TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Hex>;
    setupCustomDelayModule: <TTransport extends Transport>(
        args: Parameters<
            typeof setupCustomDelayModule<
                entryPoint,
                TTransport,
                TChain,
                TAccount
            >
        >[1]
    ) => Promise<Hex>;
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
        estimateUserOperationGas: (
            args: Omit<
                EstimateUserOperationGasParameters<entryPoint>,
                "entryPoint"
            >,
            stateOverrides?: StateOverrides
        ) =>
            estimateUserOperationGas<entryPoint>(
                client,
                { ...args, entryPoint: ENTRYPOINT_ADDRESS_V07 as entryPoint },
                stateOverrides
            ),
        validateAddDevice: (args) =>
            validateAddDevice<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                    middleware,
                } as ValidateAddDevice<entryPoint>
            ),
        setUpRecoveryModule: (args) =>
            setUpRecoveryModule<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                    middleware,
                } as SetUpRecoveryModuleParams<entryPoint>
            ),
        isRecoveryActive: (args) =>
            isRecoveryActive<entryPoint, TTransport, TChain, TAccount>(client, {
                ...args,
                middleware,
            } as IsRecoveryActiveParams),
        getRecoveryRequest: (args) =>
            getRecoveryRequest<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                    middleware,
                } as GetRecoveryRequestParams
            ),
        cancelRecoveryRequest: (args) =>
            cancelRecoveryRequest<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                    middleware,
                } as CancelRecoveryRequestParams<entryPoint>
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
        estimateGas: async (args) => estimateGas(client, args),
        getDelayModuleAddress: (args) =>
            getDelayModuleAddress<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                } as GetDelayModuleAddressParams
            ),
        getGuardianAddress: (args) =>
            getGuardianAddress<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                } as GetGuardianAddressParams
            ),
        addGuardian: (args) =>
            addGuardian<entryPoint, TTransport, TChain, TAccount>(client, {
                ...args,
                middleware,
            } as AddGuardianParams<entryPoint>),
        disableGuardian: (args) =>
            disableGuardian<entryPoint, TTransport, TChain, TAccount>(client, {
                ...args,
                middleware,
            } as DisableGuardianParams<entryPoint>),
        setupCustomDelayModule: (args) =>
            setupCustomDelayModule<entryPoint, TTransport, TChain, TAccount>(
                client,
                {
                    ...args,
                    middleware,
                } as SetupCustomDelayModuleParams<entryPoint>
            ),
    });
}
