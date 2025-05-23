import {
    type Address,
    type Hex,
    concat,
    encodePacked,
    toBytes,
    toHex,
} from "viem";
import type { SafeSignature } from "../types";

export const ECDSA_DUMMY_SIGNATURE =
    "0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

export const DUMMY_AUTHENTICATOR_DATA = new Uint8Array(37);
DUMMY_AUTHENTICATOR_DATA.fill(0xfe);
DUMMY_AUTHENTICATOR_DATA[32] = 0x04;

export const buildSignatureBytes = (signatures: SafeSignature[]): string => {
    const SIGNATURE_LENGTH_BYTES = 65;
    signatures.sort((left, right) =>
        left.signer.toLowerCase().localeCompare(right.signer.toLowerCase())
    );

    let signatureBytes = "0x";
    let dynamicBytes = "";
    for (const sig of signatures) {
        if (sig.dynamic) {
            /* 
                A contract signature has a static part of 65 bytes and the dynamic part that needs to be appended 
                at the end of signature bytes.
                The signature format is
                Signature type == 0
                Constant part: 65 bytes
                {32-bytes signature verifier}{32-bytes dynamic data position}{1-byte signature type}
                Dynamic part (solidity bytes): 32 bytes + signature data length
                {32-bytes signature length}{bytes signature data}
            */
            const dynamicPartPosition = (
                signatures.length * SIGNATURE_LENGTH_BYTES +
                dynamicBytes.length / 2
            )
                .toString(16)
                .padStart(64, "0");
            const dynamicPartLength = (sig.data.slice(2).length / 2)
                .toString(16)
                .padStart(64, "0");
            const staticSignature = `${sig.signer
                .slice(2)
                .padStart(64, "0")}${dynamicPartPosition}00`;
            const dynamicPartWithLength = `${dynamicPartLength}${sig.data.slice(
                2
            )}`;

            signatureBytes += staticSignature;
            dynamicBytes += dynamicPartWithLength;
        } else {
            signatureBytes += sig.data.slice(2);
        }
    }

    return signatureBytes + dynamicBytes;
};

export function packPaymasterData({
    paymaster,
    paymasterVerificationGasLimit,
    paymasterPostOpGasLimit,
    paymasterData,
}: {
    paymaster: Address;
    paymasterVerificationGasLimit: bigint;
    paymasterPostOpGasLimit: bigint;
    paymasterData: Hex;
}) {
    if (!paymasterData) return "0x";

    return encodePacked(
        ["address", "uint128", "uint128", "bytes"],
        [
            paymaster as Address,
            paymasterVerificationGasLimit as bigint,
            paymasterPostOpGasLimit as bigint,
            paymasterData as Hex,
        ]
    ) as Hex;
}

export const packInitCode = ({
    factory,
    factoryData,
}: {
    factory?: Address;
    factoryData?: Hex;
}) => {
    if (!(factoryData && factory)) return "0x";

    const factoryBytes = toBytes(factory);
    const factoryDataBytes = toBytes(factoryData);

    return toHex(concat([factoryBytes, factoryDataBytes]));
};
