import type { Address, Chain, Client, Hash, Hex, Transport } from "viem";

import {
    type CancelRecoveryRequestParams,
    cancelRecoveryRequest,
} from "@/recovery/cancelRecoveryRequest";
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
} from "@/recovery/customRecoveryActions";
import {
    type GetRecoveryRequestParams,
    getRecoveryRequest,
} from "@/recovery/getRecoveryRequest";
import {
    type IsRecoveryActiveParams,
    type IsRecoveryActiveReturnType,
    isRecoveryActive,
} from "@/recovery/isRecoveryActive";
import {
    type SetUpRecoveryModuleParams,
    setUpRecoveryModule,
} from "@/recovery/setUpRecoveryModule";
import type { RecoveryParamsResponse } from "@/services/delayModuleService";
import type { SmartAccount } from "viem/account-abstraction";

export type RecoveryActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount | undefined = SmartAccount | undefined,
> = {
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
};

export function recoveryActions() {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount | undefined =
            | SmartAccount
            | undefined,
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): RecoveryActions<TChain, TSmartAccount> => {
        return {
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
        } as RecoveryActions<TChain, TSmartAccount>;
    };
}
