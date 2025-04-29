import type { Chain, Client, Hash, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import {
    type AddPasskeyOwner,
    addPasskeyOwner,
} from "../addPasskeyOwnerActions";

export type PasskeyActions<
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
> = {
    addPasskeyOwner: <TTransport extends Transport>(
        args: Parameters<
            typeof addPasskeyOwner<TTransport, TChain, TAccount>
        >[1]
    ) => Promise<Hash>;
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
        } as PasskeyActions<TChain, TAccount>;
    };
}
