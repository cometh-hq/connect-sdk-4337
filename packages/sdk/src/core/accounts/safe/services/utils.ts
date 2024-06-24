import { type Address, type Hex, concat, pad, toBytes, toHex } from "viem";
import type { SafeSignature } from "../types";

export const ECDSA_DUMMY_SIGNATURE =
    "0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

export const DUMMY_AUTHENTICATOR_DATA = new Uint8Array(37);
DUMMY_AUTHENTICATOR_DATA.fill(0xfe);
DUMMY_AUTHENTICATOR_DATA[32] = 0x04;

/**
 * Dummy client data JSON fields. This can be used for gas estimations, as it pads the fields enough
 * to account for variations in WebAuthn implementations.
 */
export const DUMMY_CLIENT_DATA_FIELDS = [
    `"origin":"http://safe.global"`,
    `"padding":"This pads the clientDataJSON so that we can leave room for additional implementation specific fields for a more accurate 'preVerificationGas' estimate."`,
].join(",");

/**
 * Encodes the given WebAuthn signature into a string. This computes the ABI-encoded signature parameters:
 * ```solidity
 * abi.encode(authenticatorData, clientDataFields, r, s);
 * ```
 *
 * @param authenticatorData - The authenticator data as a Uint8Array.
 * @param clientDataFields - The client data fields as a string.
 * @param r - The value of r as a bigint.
 * @param s - The value of s as a bigint.
 * @returns The encoded string.
 */
export function getSignatureBytes({
    authenticatorData,
    clientDataFields,
    r,
    s,
}: {
    authenticatorData: Uint8Array;
    clientDataFields: string;
    r: bigint;
    s: bigint;
}): string {
    // Helper functions
    // Convert a number to a 64-byte hex string with padded upto Hex string with 32 bytes
    const encodeUint256 = (x: bigint | number) =>
        x.toString(16).padStart(64, "0");
    // Calculate the byte size of the dynamic data along with the length parameter alligned to 32 bytes
    const byteSize = (data: Uint8Array) =>
        32 * (Math.ceil(data.length / 32) + 1); // +1 is for the length parameter
    // Encode dynamic data padded with zeros if necessary in 32 bytes chunks
    const encodeBytes = (data: Uint8Array) =>
        `${encodeUint256(data.length)}${toHex(data).slice(2)}`.padEnd(
            byteSize(data) * 2,
            "0"
        );

    // authenticatorData starts after the first four words.
    const authenticatorDataOffset = 32 * 4;
    // clientDataFields starts immediately after the authenticator data.
    const clientDataFieldsOffset =
        authenticatorDataOffset + byteSize(authenticatorData);

    return `0x${encodeUint256(authenticatorDataOffset)}${encodeUint256(
        clientDataFieldsOffset
    )}${encodeUint256(r)}${encodeUint256(s)}${encodeBytes(
        authenticatorData
    )}${encodeBytes(new TextEncoder().encode(clientDataFields))}`;
}

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
    return concat([
        paymaster,
        pad(toHex(paymasterVerificationGasLimit), { size: 16 }),
        pad(toHex(paymasterPostOpGasLimit), { size: 16 }),
        paymasterData,
    ]);
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
