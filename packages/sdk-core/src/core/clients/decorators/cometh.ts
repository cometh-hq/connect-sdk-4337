import type { Chain, Client, Hex, Transport } from "viem";

import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { is7579Installed } from "@/core/actions/accounts/7579/is7579Installed";
import { setFallbackTo7579 } from "@/core/actions/accounts/7579/setFallbackTo7579";
import {
    type SmartAccountActions,
    smartAccountActions,
} from "@/core/actions/accounts/safe/smartAccountActions";

export type ComethClientActions<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
> = SmartAccountActions<TChain, TSmartAccount> & {
    setFallbackTo7579: () => Promise<Hex>;
    is7579Installed: () => Promise<boolean>;
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
            setFallbackTo7579: () =>
                setFallbackTo7579<TTransport, TChain, TSmartAccount>(client),
            is7579Installed: () =>
                is7579Installed<TTransport, TChain, TSmartAccount>(client),
        } as ComethClientActions<TChain, TSmartAccount>;
    };
}
