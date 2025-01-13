import type { Address, Chain, Client, Hash, Hex, Transport } from "viem";

import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { setFallbackTo7579 } from "@/core/actions/accounts/7579/setFallbackTo7579";
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
import {
    type VerifySignatureParams,
    verifySignature,
} from "@/core/actions/accounts/safe/verifySignature";
import type { RecoveryParamsResponse } from "@/core/services/delayModuleService";
import { type SmartAccountActions, smartAccountActions } from "permissionless";

export type ComethClientActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
> = SmartAccountActions<TChain, TSmartAccount> & {
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
    getDelayModuleAddress: <TTransport extends Transport>(
        args: Parameters<
            typeof getDelayModuleAddress<TTransport, TChain, TSmartAccount>
        >[1]
    ) => Promise<Address>;
    getGuardianAddress: <TTransport extends Transport>(
        args: Parameters<
            typeof getGuardianAddress<TTransport, TChain, TSmartAccount>
        >[1]
    ) => Promise<Address>;
    addGuardian: <TTransport extends Transport>(
        args: Parameters<
            typeof addGuardian<TTransport, TChain, TSmartAccount>
        >[1]
    ) => Promise<Hex>;
    disableGuardian: <TTransport extends Transport>(
        args: Parameters<
            typeof disableGuardian<TTransport, TChain, TSmartAccount>
        >[1]
    ) => Promise<Hex>;
    setupCustomDelayModule: <TTransport extends Transport>(
        args: Parameters<
            typeof setupCustomDelayModule<TTransport, TChain, TSmartAccount>
        >[1]
    ) => Promise<Hex>;
    setFallbackTo7579: () => Promise<Hex>;
};

export function comethAccountClientActions() {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): ComethClientActions<TChain, TSmartAccount> => {
        return {
            ...smartAccountActions(client),
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
            getDelayModuleAddress: (args) =>
                getDelayModuleAddress<TTransport, TChain, TSmartAccount>(
                    client,
                    {
                        ...args,
                    } as GetDelayModuleAddressParams
                ),
            getGuardianAddress: (args) =>
                getGuardianAddress<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as GetGuardianAddressParams),
            addGuardian: (args) =>
                addGuardian<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as AddGuardianParams),
            disableGuardian: (args) =>
                disableGuardian<TTransport, TChain, TSmartAccount>(client, {
                    ...args,
                } as DisableGuardianParams),
            setupCustomDelayModule: (args) =>
                setupCustomDelayModule<TTransport, TChain, TSmartAccount>(
                    client,
                    {
                        ...args,
                    } as SetupCustomDelayModuleParams
                ),
            setFallbackTo7579: () =>
                setFallbackTo7579<TTransport, TChain, TSmartAccount>(client),
        } as ComethClientActions<TChain, TSmartAccount>;
    };
}
