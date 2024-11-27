import type { EntryPoint } from "permissionless/_types/types";
import type { SmartAccount } from "permissionless/accounts";
import type {
    Abi,
    Chain,
    Client,
    CustomSource,
    Hex,
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
    migrate: () => Promise<RelayedTransaction>;
    prepareImportSafeTx: () => Promise<SafeTransactionDataPartial>;
    importSafe: ({
        tx,
        signature,
    }: {
        tx: SafeTransactionDataPartial;
        signature: Hex;
    }) => Promise<RelayedTransaction>;
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
    signTransaction,
    migrate,
    hasMigrated,
    prepareImportSafeTx,
    importSafe,
}: TAccountSource & {
    source: TSource;
    client: Client<transport, chain>;
    migrate: (_tx: SafeTransactionDataPartial) => Promise<RelayedTransaction>;
    hasMigrated: () => Promise<boolean>;
    prepareImportSafeTx: () => Promise<SafeTransactionDataPartial>;
    importSafe: ({
        tx,
        signature,
    }: {
        tx: SafeTransactionDataPartial;
        signature: Hex;
    }) => Promise<RelayedTransaction>;
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
        async signTransaction(tx) {
            const signature = await signTransaction(tx);
            return signature;
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
        importSafe,
        prepareImportSafeTx,
    } as LegacySmartAccount<TEntryPoint, TSource, transport, chain, TAbi>;
}
