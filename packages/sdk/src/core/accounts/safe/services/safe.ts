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
    zeroHash,
} from "viem";
import { MultiSendContractABI } from "../abi/Multisend";
import { EnableModuleAbi } from "../abi/enableModule";
import { SafeAbi } from "../abi/safe";
import { SafeWebAuthnSharedSignerAbi } from "../abi/sharedWebAuthnSigner";
import type { MultiSendTransaction, WebAuthnSharedSignerData } from "../types";

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
    signer,
    setUpContractAddress,
    SafeWebAuthnSharedSignerContractAddress,
}: {
    modules: Address[];
    signer: WebAuthnSharedSignerData;
    setUpContractAddress: Address;
    SafeWebAuthnSharedSignerContractAddress: Address;
}) => {
    const enableModuleCallData = encodeFunctionData({
        abi: EnableModuleAbi,
        functionName: "enableModules",
        args: [modules],
    });

    const sharedSignerConfigCallData = encodeFunctionData({
        abi: SafeWebAuthnSharedSignerAbi,
        functionName: "configure",
        args: [
            {
                x: hexToBigInt(signer.x),
                y: hexToBigInt(signer.y),
                verifiers: hexToBigInt(signer.verifiers),
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
                    to: SafeWebAuthnSharedSignerContractAddress,
                    data: sharedSignerConfigCallData,
                },
            ]),
        ],
    });
};

export const getSafeInitializer = (
    comethSigner: ComethSigner,
    threshold: number,
    fallbackHandler: Address,
    modules: Address[],
    setUpContractAddress: Address,
    safeWebAuthnSharedSignerContractAddress: Address,
    p256Verifier: Address,
    setupTo: Address
): Hex => {
    let setUpData: Hex;
    let owners: Address[];

    if (comethSigner.type === "localWallet") {
        owners = [comethSigner.eoaFallback.signer.address];
        setupTo = zeroAddress;
        setUpData = zeroHash;
    } else {
        owners = [safeWebAuthnSharedSignerContractAddress];

        setUpData = getSetUpData({
            modules,
            signer: {
                x: comethSigner.passkey.pubkeyCoordinates.x,
                y: comethSigner.passkey.pubkeyCoordinates.y,
                verifiers: p256Verifier,
            },
            setUpContractAddress: setUpContractAddress,
            SafeWebAuthnSharedSignerContractAddress:
                safeWebAuthnSharedSignerContractAddress,
        });
    }

    return encodeFunctionData({
        abi: SafeAbi,
        functionName: "setup",
        args: [
            owners,
            threshold,
            setupTo,
            setUpData,
            fallbackHandler,
            zeroAddress,
            0,
            zeroAddress,
        ],
    });
};
