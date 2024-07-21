import type { ComethSigner } from "@/core/signers/types";
import type { UserOperation } from "@/core/types";
import {
    type Address,
    type Hex,
    concat,
    decodeFunctionData,
    encodeFunctionData,
    encodePacked,
    getAddress,
    hexToBigInt,
    size,
    zeroAddress,
} from "viem";
import { MultiSendContractABI } from "../abi/Multisend";
import { EnableModuleAbi } from "../abi/enableModule";
import { SafeAbi } from "../abi/safe";
import { safe4337SessionKeyModuleAbi } from "../abi/safe4337SessionKeyModuleAbi";
import { SafeWebAuthnSharedSignerAbi } from "../abi/sharedWebAuthnSigner";
import type { MultiSendTransaction } from "../types";

/**
 * Encodes multiple transactions into a single byte string for multi-send functionality
 * @param transactions - Array of MultiSendTransaction objects
 * @returns Concatenated and encoded transactions as a Hex string
 */
export const encodeMultiSendTransactions = (
    transactions: MultiSendTransaction[]
) => {
    return concat(
        transactions.map(({ op, to, value, data }) =>
            encodePacked(
                ["uint8", "address", "uint256", "uint256", "bytes"],
                [op, to, value ?? 0n, BigInt(size(data)), data as `0x${string}`]
            )
        )
    );
};

/**
 * Decodes a user operation into an array of MultiSendTransactions
 * @param userOperation - The user operation to decode
 * @param multisend - The address of the multisend contract
 * @returns An array of decoded MultiSendTransaction objects
 */
export const decodeUserOp = ({
    userOperation,
    multisend,
}: {
    userOperation: UserOperation;
    multisend: Address;
}): MultiSendTransaction[] => {
    const { args } = decodeFunctionData({
        abi: safe4337SessionKeyModuleAbi,
        data: userOperation.callData as `0x${string}`,
    });

    if (!args) throw new Error("Invalid callData for Safe Account");

    const txs: MultiSendTransaction[] = [];

    if (args[0] === multisend) {
        const decodedData = decodeFunctionData({
            abi: MultiSendContractABI,
            data: args[2] as `0x${string}`,
        });

        const multisendArgs = decodedData.args[0];

        // Decode after 0x
        let index = 2;

        while (index < multisendArgs.length) {
            // As we are decoding hex encoded bytes calldata, each byte is represented by 2 chars
            // uint8 operation, address to, value uint256, dataLength uint256

            const operation = `0x${multisendArgs.slice(index, index + 2)}`;
            index += 2;
            const to = `0x${multisendArgs.slice(index, index + 40)}`;
            index += 40;
            const value = `0x${multisendArgs.slice(index, index + 64)}`;
            index += 64;
            const dataLength =
                parseInt(multisendArgs.slice(index, index + 64), 16) * 2;
            index += 64;
            const data = `0x${multisendArgs.slice(
                index,
                index + dataLength
            )}` as Hex;
            index += dataLength;

            txs.push({
                op: Number(operation) as 0 | 1,
                to: getAddress(to),
                value: BigInt(value),
                data,
            });
        }
    } else {
        txs.push({
            to: args[0] as Address,
            value: args[1] as bigint,
            data: args[2] as Hex,
            op: args[3] as 0 | 1,
        });
    }

    return txs;
};

/**
 * Generates setup data for enabling modules and configuring the signer
 * @param modules - Array of module addresses to enable
 * @param comethSigner - The Cometh signer instance
 * @param setUpContractAddress - Address of the setup contract
 * @param safeWebAuthnSharedSignerContractAddress - Address of the WebAuthn shared signer contract
 * @param safeP256VerifierAddress - Address of the P256 verifier contract
 * @returns Encoded setup data as a Hex string
 */
export const getSetUpData = ({
    modules,
    comethSigner,
    setUpContractAddress,
    safeWebAuthnSharedSignerContractAddress,
    safeP256VerifierAddress,
}: {
    modules: Hex[];
    comethSigner: ComethSigner;
    setUpContractAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    safeP256VerifierAddress: Address;
}) => {
    const enableModuleCallData = encodeFunctionData({
        abi: EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    });

    if (comethSigner.type === "passkey") {
        const sharedSignerConfigCallData = encodeFunctionData({
            abi: SafeWebAuthnSharedSignerAbi,
            functionName: "configure",
            args: [
                {
                    x: hexToBigInt(comethSigner.passkey.pubkeyCoordinates.x),
                    y: hexToBigInt(comethSigner.passkey.pubkeyCoordinates.y),
                    verifiers: hexToBigInt(safeP256VerifierAddress),
                },
            ],
        });

        return encodeFunctionData({
            abi: MultiSendContractABI,
            functionName: "multiSend",
            args: [
                encodeMultiSendTransactions([
                    {
                        op: 1 as const,
                        to: setUpContractAddress,
                        data: enableModuleCallData,
                    },
                    {
                        op: 1 as const,
                        to: safeWebAuthnSharedSignerContractAddress,
                        data: sharedSignerConfigCallData,
                    },
                ]),
            ],
        });
    }

    return enableModuleCallData;
};

/**
 * Generates the initializer data for a Safe smart contract
 * @param comethSigner - The Cometh signer instance
 * @param threshold - The threshold for the multi-signature wallet
 * @param fallbackHandler - Address of the fallback handler
 * @param modules - Array of module addresses to enable
 * @param setUpContractAddress - Address of the setup contract
 * @param safeWebAuthnSharedSignerContractAddress - Address of the WebAuthn shared signer contract
 * @param p256Verifier - Address of the P256 verifier contract
 * @param multisendAddress - Address of the multisend contract
 * @returns Encoded initializer data as a Hex string
 */
export const getSafeInitializer = (
    comethSigner: ComethSigner,
    threshold: number,
    fallbackHandler: Address,
    modules: Address[],
    setUpContractAddress: Address,
    safeWebAuthnSharedSignerContractAddress: Address,
    p256Verifier: Address,
    multisendAddress: Address
): Hex => {
    const setUpData = getSetUpData({
        modules,
        comethSigner,
        setUpContractAddress: setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress:
            safeWebAuthnSharedSignerContractAddress,
        safeP256VerifierAddress: p256Verifier,
    });

    if (comethSigner.type === "localWallet") {
        return encodeFunctionData({
            abi: SafeAbi,
            functionName: "setup",
            args: [
                [comethSigner.eoaFallback.signer.address],
                threshold,
                setUpContractAddress,
                setUpData,
                fallbackHandler,
                zeroAddress,
                0,
                zeroAddress,
            ],
        });
    }

    return encodeFunctionData({
        abi: SafeAbi,
        functionName: "setup",
        args: [
            [safeWebAuthnSharedSignerContractAddress],
            threshold,
            multisendAddress,
            setUpData,
            fallbackHandler,
            zeroAddress,
            0,
            zeroAddress,
        ],
    });
};
