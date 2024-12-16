import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { SafeContractParams } from "@/core/accounts/safe/types";
import type { API } from "@/core/services/API";
import { getDeviceData } from "@/core/services/deviceService";
import { throwErrorWhenEoaFallbackDisabled } from "@/core/signers/createSigner";
import { createFallbackEoaSigner } from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import {
    createPasskeySigner,
    setPasskeyInStorage,
} from "@/core/signers/passkeys/passkeyService";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import type { ComethSigner, ComethSignerConfig } from "@/core/signers/types";
import type { DeviceData } from "@/core/types";
import { RelayedTransactionError } from "@/errors";
import type {
    RelayedTransactionDetails,
    SafeTransactionDataPartial,
} from "@/migrationKit/types";
import {
    type Address,
    type Hex,
    type PrivateKeyAccount,
    encodeFunctionData,
    zeroAddress,
} from "viem";

// 60 secondes
const DEFAULT_CONFIRMATION_TIME = 60 * 1000;

export const signTypedData = async ({
    signer,
    chainId,
    verifyingContract,
    tx,
    nonce,
}: {
    signer: PrivateKeyAccount;
    chainId: number;
    verifyingContract: Address;
    tx: SafeTransactionDataPartial;
    nonce: bigint;
}) => {
    return signer.signTypedData({
        domain: {
            chainId,
            verifyingContract,
        },
        primaryType: "SafeTx",
        types: {
            SafeTx: [
                { type: "address", name: "to" },
                { type: "uint256", name: "value" },
                { type: "bytes", name: "data" },
                { type: "uint8", name: "operation" },
                { type: "uint256", name: "safeTxGas" },
                { type: "uint256", name: "baseGas" },
                { type: "uint256", name: "gasPrice" },
                { type: "address", name: "gasToken" },
                { type: "address", name: "refundReceiver" },
                { type: "uint256", name: "nonce" },
            ],
        },
        message: {
            to: tx.to as Address,
            value: BigInt(tx.value),
            data: tx.data as Hex,
            operation: tx.operation as number,
            safeTxGas: BigInt(tx.safeTxGas as string),
            baseGas: BigInt(tx.baseGas as string),
            gasPrice: BigInt(tx.gasPrice as string),
            gasToken: (tx.gasToken ?? zeroAddress) as Hex,
            refundReceiver: zeroAddress,
            nonce: nonce,
        },
    });
};

export const create4337Signer = async ({
    isWebAuthnCompatible,
    api,
    comethSignerConfig,
    safeWebAuthnSharedSignerContractAddress,
}: {
    isWebAuthnCompatible: boolean;
    api: API;
    comethSignerConfig?: ComethSignerConfig;
    safeWebAuthnSharedSignerContractAddress: Address;
}): Promise<ComethSigner> => {
    if (isWebAuthnCompatible) {
        const passkey = await createPasskeySigner({
            api,
            webAuthnOptions: comethSignerConfig?.webAuthnOptions ?? {},
            passKeyName: comethSignerConfig?.passKeyName,
            fullDomainSelected: comethSignerConfig?.fullDomainSelected ?? false,
            safeWebAuthnSharedSignerAddress:
                safeWebAuthnSharedSignerContractAddress,
        });

        if (passkey.publicKeyAlgorithm !== -7) {
            console.warn("ECC passkey are not supported by your device");
            throwErrorWhenEoaFallbackDisabled(
                comethSignerConfig?.disableEoaFallback as boolean
            );

            return {
                type: "localWallet",
                eoaFallback: await createFallbackEoaSigner(),
            };
        }

        return {
            type: "passkey",
            passkey: {
                id: passkey.id as Hex,
                pubkeyCoordinates: {
                    x: passkey.pubkeyCoordinates.x as Hex,
                    y: passkey.pubkeyCoordinates.y as Hex,
                },
                signerAddress: passkey.signerAddress as Address,
            },
        };
    }
    return {
        type: "localWallet",
        eoaFallback: await createFallbackEoaSigner(),
    };
};

export const createCalldataAndImport = async ({
    api,
    smartAccountAddress,
    chainId,
    contractParams,
    tx,
    signature,
    passkey,
    eoaSigner,
}: {
    api: API;
    smartAccountAddress: Address;
    chainId: number;
    contractParams: SafeContractParams;
    tx: SafeTransactionDataPartial;
    signature: Hex;
    passkey?: PasskeyLocalStorageFormat;
    eoaSigner?: PrivateKeyAccount;
}): Promise<Hex> => {
    const signerAddress = (
        passkey
            ? contractParams?.safeWebAuthnSharedSignerContractAddress
            : eoaSigner?.address
    ) as Address;

    const transactionCalldata = encodeFunctionData({
        abi: SafeAbi,
        functionName: "execTransaction",
        args: [
            tx.to,
            tx.value,
            tx.data,
            tx.operation,
            tx.safeTxGas,
            tx.baseGas,
            tx.gasPrice,
            tx.gasToken,
            tx.refundReceiver,
            signature,
        ],
    });

    const relayId = await api.importExternalSafe({
        smartAccountAddress,
        publicKeyId: passkey?.id as Hex,
        publicKeyY: passkey?.pubkeyCoordinates.x as Hex,
        publicKeyX: passkey?.pubkeyCoordinates.y as Hex,
        deviceData: getDeviceData() as DeviceData,
        signerAddress,
        chainId: chainId.toString() as string,
        transactionCalldata,
    });

    if (passkey) {
        setPasskeyInStorage(
            smartAccountAddress as Address,
            passkey.id as Hex,
            passkey.pubkeyCoordinates.x as Hex,
            passkey.pubkeyCoordinates.y as Hex,
            signerAddress as Address
        );
    }

    return relayId;
};

export const extractComethSignerParams = (signer: ComethSigner) => {
    return {
        passkey:
            signer.type === "passkey"
                ? (signer.passkey as PasskeyLocalStorageFormat)
                : undefined,
        eoaSigner:
            signer.type === "localWallet"
                ? (signer.eoaFallback.signer as PrivateKeyAccount)
                : undefined,
    };
};

export const waitForTransactionRelayAndImport = async ({
    relayId,
    api,
    chainId,
}: {
    relayId: string;
    api: API;
    chainId: number;
}): Promise<Hex | undefined> => {
    const startDate = Date.now();
    const timeoutLimit = new Date(
        startDate + DEFAULT_CONFIRMATION_TIME
    ).getTime();

    let relayedTransaction: RelayedTransactionDetails | undefined = undefined;

    while (
        !(relayedTransaction as RelayedTransactionDetails)?.status.confirmed &&
        Date.now() < timeoutLimit
    ) {
        await new Promise((resolve) => setTimeout(resolve, 4000));

        relayedTransaction = await api.getRelayedTransaction(relayId, chainId);

        if (relayedTransaction?.status.confirmed) {
            return relayedTransaction.status.confirmed.hash as Hex;
        }
    }

    if (!relayedTransaction?.status.confirmed)
        throw new RelayedTransactionError();

    return undefined;
};
