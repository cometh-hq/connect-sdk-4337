import type { Chain, Client, Hash, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import {
    type AddPasskeyOwner,
    addPasskeyOwner,
} from "../addPasskeyOwnerActions";
import {
    type EnrichedOwner,
    type GetEnrichedOwners,
    getEnrichedOwners,
} from "../safeOwnerActions";

export type PasskeyActions<
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
> = {
    addPasskeyOwner: <TTransport extends Transport>(
        args: Parameters<
            typeof addPasskeyOwner<TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Hash>;
    getEnrichedOwners: <TTransport extends Transport>(
        args: Parameters<
            typeof getEnrichedOwners<TTransport, TChain, TAccount>
        >[1]
    ) => Promise<EnrichedOwner[]>;
};

export function passkeyActions() {
    return <
        TTransport extends Transport = Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TAccount extends SmartAccount | undefined = SmartAccount | undefined,
    >(
        client: Client<TTransport, TChain, TAccount>
    ): PasskeyActions<TChain, TAccount> => {
        return {
            addPasskeyOwner: (args) =>
                addPasskeyOwner<TTransport, TChain, TAccount>(client, {
                    ...args,
                } as AddPasskeyOwner),
            getEnrichedOwners: (args) =>
                getEnrichedOwners<TTransport, TChain, TAccount>(client, {
                    ...args,
                } as GetEnrichedOwners),
        } as PasskeyActions<TChain, TAccount>;
    };
}
