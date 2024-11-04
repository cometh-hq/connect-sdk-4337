import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    type ValidateAddDevice,
    validateAddDevice,
} from "@/core/actions/accounts/safe/owners/addDeviceActions";
import {
    type CancelRecoveryRequestParams,
    cancelRecoveryRequest,
} from "@/core/actions/accounts/safe/recovery/cancelRecoveryRequest";
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
import {
    type VerifySignatureParams,
    verifySignature,
} from "@/core/actions/accounts/safe/verifySignature";
import type { SmartSessionCreateActions } from "@/core/modules/sessionKey/decorators";
import type { RecoveryParamsResponse } from "@/core/services/delayModuleService";
import { type SmartAccountActions, smartAccountActions } from "permissionless";
import {
    type Erc7579Actions,
    erc7579Actions,
} from "permissionless/actions/erc7579";
import type { Chain, Client, Hash, Transport } from "viem";

export type ComethClientActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
> = SmartAccountActions<TChain, TSmartAccount> &
    Erc7579Actions<TSmartAccount> &
    SmartSessionCreateActions<TSmartAccount> & {
        validateAddDevice: <TTransport extends Transport>(
            args: Parameters<
                typeof validateAddDevice<TTransport, TChain, TSmartAccount>
            >[1]
        ) => Promise<Hash>;
        setUpRecoveryModule: <TTransport extends Transport>(
            args: Parameters<
                typeof setUpRecoveryModule<TTransport, TChain, TSmartAccount>
            >[1]
        ) => Promise<Hash>;
        cancelRecoveryRequest: <TTransport extends Transport>(
            args: Parameters<
                typeof cancelRecoveryRequest<TTransport, TChain, TSmartAccount>
            >[1]
        ) => Promise<Hash>;
        isRecoveryActive: <TTransport extends Transport>(
            args: Parameters<
                typeof isRecoveryActive<TTransport, TChain, TSmartAccount>
            >[1]
        ) => Promise<IsRecoveryActiveReturnType>;
        getRecoveryRequest: <TTransport extends Transport>(
            args: Parameters<
                typeof getRecoveryRequest<TTransport, TChain, TSmartAccount>
            >[1]
        ) => Promise<RecoveryParamsResponse | undefined>;
        verifySignature: <TTransport extends Transport>(
            args: Parameters<
                typeof verifySignature<TTransport, TChain, TSmartAccount>
            >[1]
        ) => Promise<boolean>;
    };

export function comethAccountClientActions() {
    return <
        TTransport extends Transport = Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends ComethSafeSmartAccount | undefined =
            | ComethSafeSmartAccount
            | undefined,
    >(
        client: Client<Transport, TChain, TSmartAccount>
    ): ComethClientActions<TChain, TSmartAccount> => {
        return {
            ...smartAccountActions()(client),
            ...erc7579Actions()(client),
            validateAddDevice: (args) =>
                validateAddDevice<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as ValidateAddDevice),
            setUpRecoveryModule: (args) =>
                setUpRecoveryModule<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as SetUpRecoveryModuleParams),
            isRecoveryActive: (args) =>
                isRecoveryActive<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as IsRecoveryActiveParams),
            getRecoveryRequest: (args) =>
                getRecoveryRequest<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as GetRecoveryRequestParams),
            cancelRecoveryRequest: (args) =>
                cancelRecoveryRequest<TTransport, TChain, TSmartAccount>(
                    client,
                    {
                        ...args,
                    } as CancelRecoveryRequestParams
                ),
            verifySignature: (args) =>
                verifySignature<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as VerifySignatureParams),
        } as ComethClientActions<TChain, TSmartAccount>;
    };
}
