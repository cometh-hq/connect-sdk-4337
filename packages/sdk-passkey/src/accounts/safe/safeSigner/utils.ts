import {
    type Hex,
    type SignableMessage,
    type TypedData,
    type TypedDataDefinition,
    hashMessage,
    hashTypedData,
} from "viem";

export const generateSafeMessageMessage = <
    const TTypedData extends TypedData | { [key: string]: unknown },
    TPrimaryType extends keyof TTypedData | "EIP712Domain" = keyof TTypedData,
>(
    message: SignableMessage | TypedDataDefinition<TTypedData, TPrimaryType>
): Hex => {
    const signableMessage = message as SignableMessage;

    if (typeof signableMessage === "string" || signableMessage.raw) {
        return hashMessage(signableMessage);
    }

    return hashTypedData(
        message as TypedDataDefinition<TTypedData, TPrimaryType>
    );
};
