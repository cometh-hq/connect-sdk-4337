import type { ComethSigner } from "@/core/signers/types";
import {
    type Address,
    type Hex,
    concat,
    encodeFunctionData,
    encodePacked,
    hexToBigInt,
    size,
    zeroAddress,
} from "viem";
import { MultiSendContractABI } from "../abi/Multisend";
import { EnableModuleAbi } from "../abi/enableModule";
import { SafeAbi } from "../abi/safe";
import { SafeWebAuthnSharedSignerAbi } from "../abi/sharedWebAuthnSigner";
import type { MultiSendTransaction } from "../types";

export const encodeMultiSendTransactions = (
    transactions: MultiSendTransaction[]
) => {
    return concat(
        transactions.map(({ op, to, value, data }) =>
            encodePacked(
                ["uint8", "address", "uint256", "uint256", "bytes"],
                [op, to, value ?? 0, BigInt(size(data)), data as `0x${string}`]
            )
        )
    );
};

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
    } else {
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
    }
};
