import {
    type Hex,
    type SignableMessage,
    type TypedData,
    type TypedDataDefinition,
    hashMessage,
    hashTypedData,
} from "viem";

export const adjustVInSignature = (
    signingMethod: "eth_sign" | "eth_signTypedData",
    signature: string
): Hex => {
    const ETHEREUM_V_VALUES = [0, 1, 27, 28];
    const MIN_VALID_V_VALUE_FOR_SAFE_ECDSA = 27;
    let signatureV = Number.parseInt(signature.slice(-2), 16);
    if (!ETHEREUM_V_VALUES.includes(signatureV)) {
        throw new Error("Invalid signature");
    }
    if (signingMethod === "eth_sign") {
        if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
            signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA;
        }
        signatureV += 4;
    }
    if (signingMethod === "eth_signTypedData") {
        if (signatureV < MIN_VALID_V_VALUE_FOR_SAFE_ECDSA) {
            signatureV += MIN_VALID_V_VALUE_FOR_SAFE_ECDSA;
        }
    }
    return (signature.slice(0, -2) + signatureV.toString(16)) as Hex;
};

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
