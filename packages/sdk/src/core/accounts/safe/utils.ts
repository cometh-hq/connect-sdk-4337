import type {
    EntryPoint,
    GetEntryPointVersion,
    UserOperation,
} from "permissionless/_types/types";
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccount,
} from "permissionless/accounts";
import type {
    Abi,
    Address,
    Chain,
    Client,
    CustomSource,
    EncodeDeployDataParameters,
    Hex,
    SignableMessage,
    Transport,
    TypedDataDefinition,
} from "viem";
import { toAccount } from "viem/accounts";

export function toSmartAccount<
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
    entryPoint,
    getNonce,
    getInitCode,
    getFactory,
    getFactoryData,
    encodeCallData,
    getDummySignature,
    constructUserOperation,
    encodeDeployCallData,
    signUserOperation,
    signMessage,
    signTypedData,
}: TAccountSource & {
    source: TSource;
    client: Client<transport, chain>;
    entryPoint: TEntryPoint;
    getNonce: () => Promise<bigint>;
    getInitCode: () => Promise<Hex>;
    getFactory: () => Promise<Address | undefined>;
    getFactoryData: () => Promise<Hex | undefined>;
    encodeCallData: (
        args:
            | {
                  to: Address;
                  value: bigint;
                  data: Hex;
              }
            | {
                  to: Address;
                  value: bigint;
                  data: Hex;
              }[]
    ) => Promise<Hex>;
    getDummySignature(
        userOperation: UserOperation<GetEntryPointVersion<TEntryPoint>>
    ): Promise<Hex>;
    constructUserOperation(
        to: any, value: any, data: any
    ): Promise<UserOperation<"v0.7">>
    encodeDeployCallData: ({
        abi,
        args,
        bytecode,
    }: EncodeDeployDataParameters<TAbi>) => Promise<Hex>;
    signUserOperation: (
        userOperation: UserOperation<GetEntryPointVersion<TEntryPoint>>
    ) => Promise<Hex>;
}): SmartAccount<TEntryPoint, TSource, transport, chain, TAbi> {
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
        entryPoint,
        publicKey: address,
        getNonce,
        getInitCode,
        getFactory,
        getFactoryData,
        encodeCallData,
        getDummySignature,
        constructUserOperation,
        encodeDeployCallData,
        signUserOperation,
    } as SmartAccount<TEntryPoint, TSource, transport, chain, TAbi>;
}
