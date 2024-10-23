import type { EntryPoint } from "permissionless/_types/types";
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount,
} from "permissionless/accounts";
import type {
    Abi,
    Chain,
    Client,
    CustomSource,
    SignableMessage,
    Transport,
    TypedDataDefinition,
} from "viem";
import { toAccount } from "viem/accounts";
import type { RelayedTransaction, SafeTransactionDataPartial } from "./types";

type LegacySmartAccount<
    TEntryPoint extends EntryPoint,
    TSource extends string = string,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    TAbi extends Abi | readonly unknown[] = Abi,
> = SmartAccount<TEntryPoint, TSource, transport, chain, TAbi> & {
    migrate: (_tx: SafeTransactionDataPartial) => Promise<RelayedTransaction>;
    hasMigrated: () => Promise<boolean>;
};

export function toLegacySmartAccount<
    TAccountSource extends CustomSource,
    TEntryPoint extends EntryPoint,
    TSource extends string = string,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    TAbi extends Abi | readonly unknown[] = Abi,
>({
    address,
    client,
    source,
    signMessage,
    signTypedData,
    migrate,
    hasMigrated,
}: TAccountSource & {
    source: TSource;
    client: Client<transport, chain>;
    migrate: (_tx: SafeTransactionDataPartial) => Promise<RelayedTransaction>;
    hasMigrated: () => Promise<boolean>;
}): LegacySmartAccount<TEntryPoint, TSource, transport, chain, TAbi> {
    const account = toAccount({
        address: address,
        signMessage: async ({ message }: { message: SignableMessage }) => {
            const signature = await signMessage({ message });

            return signature;
        },
        signTypedData: async (typedData) => {
            const signature = await signTypedData(
                typedData as TypedDataDefinition
            );

            return signature;
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
    });

    return {
        ...account,
        source,
        client,
        type: "local",
        publicKey: address,
        migrate,
        hasMigrated,
    } as LegacySmartAccount<TEntryPoint, TSource, transport, chain, TAbi>;
}
