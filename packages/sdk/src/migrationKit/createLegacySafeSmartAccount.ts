import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type PrivateKeyAccount,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    hexToBigInt,
    zeroAddress,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";

import type { ComethSigner, ComethSignerConfig } from "@/core/signers/types";

import { MultiSendContractABI } from "@/core/accounts/safe/abi/Multisend";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { SafeWebAuthnSharedSignerAbi } from "@/core/accounts/safe/abi/sharedWebAuthnSigner";
import { encodeMultiSendTransactions } from "@/core/accounts/safe/services/safe";
import { getViemClient } from "@/core/accounts/utils";
import { getProjectParamsByChain } from "@/core/services/comethService";
import { getDeviceData } from "@/core/services/deviceService";
import {
    isDeviceCompatibleWithPasskeys,
    throwErrorWhenEoaFallbackDisabled,
} from "@/core/signers/createSigner";
import {
    createFallbackEoaSigner,
    getFallbackEoaSigner,
} from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import {
    createPasskeySigner,
    setPasskeyInStorage,
} from "@/core/signers/passkeys/passkeyService";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import { RelayedTransactionError } from "@/errors";
import { MigrationAbi } from "@/migrationKit/abi/migration";
import { isSmartAccountDeployed } from "permissionless";
import { comethSignerToSafeSigner } from "./safeLegacySigner/comethSignerToSafeSigner";
import { LEGACY_API } from "./services/LEGACY_API";
import { getLegacySigner } from "./signers/passkeyService";
import type {
    DeviceData,
    RelayedTransaction,
    RelayedTransactionDetails,
    SafeTransactionDataPartial,
} from "./types";
import { toLegacySmartAccount } from "./utils";

// 60 secondes
const DEFAULT_CONFIRMATION_TIME = 60 * 1000;
const multisendAddress = "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761";

export type LegacySafeSmartAccount<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = LocalAccount<string> & {
    client: Client<transport, chain>;
    migrate: () => Promise<RelayedTransaction>;
    importSafe: ({
        tx,
        signature,
    }: {
        tx: SafeTransactionDataPartial;
        signature: `0x${string}`;
    }) => Promise<RelayedTransaction>;
    prepareImportSafeTx: () => Promise<SafeTransactionDataPartial>;
    hasMigrated: () => Promise<boolean>;
};

const prepareMigrationCalldata = async ({
    threshold,
    safe4337ModuleAddress,
    safeWebAuthnSharedSignerContractAddress,
    migrationContractAddress,
    p256Verifier,
    smartAccountAddress,
    passkey,
    eoaSigner,
    isImport,
}: {
    threshold: number;
    safe4337ModuleAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    migrationContractAddress: Address;
    p256Verifier: Address;
    smartAccountAddress: Address;
    passkey?: PasskeyLocalStorageFormat;
    eoaSigner?: PrivateKeyAccount;
    isImport?: boolean;
}) => {
    const transactions = [
        {
            to: migrationContractAddress,
            value: 0n,
            data: encodeFunctionData({
                abi: MigrationAbi,
                functionName: "migrateL2Singleton",
            }),
            op: 1,
        },
        {
            to: smartAccountAddress,
            value: 0n,
            data: encodeFunctionData({
                abi: SafeAbi,
                functionName: "setFallbackHandler",
                args: [safe4337ModuleAddress],
            }),
            op: 0,
        },
        {
            to: smartAccountAddress,
            value: 0n,
            data: encodeFunctionData({
                abi: SafeAbi,
                functionName: "enableModule",
                args: [safe4337ModuleAddress],
            }),
            op: 0,
        },
    ];

    if (passkey) {
        transactions.push(
            {
                to: safeWebAuthnSharedSignerContractAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: SafeWebAuthnSharedSignerAbi,
                    functionName: "configure",
                    args: [
                        {
                            x: hexToBigInt(passkey.pubkeyCoordinates.x as Hex),
                            y: hexToBigInt(passkey.pubkeyCoordinates.y as Hex),
                            verifiers: hexToBigInt(p256Verifier),
                        },
                    ],
                }),
                op: 1,
            },
            {
                to: smartAccountAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "addOwnerWithThreshold",
                    args: [safeWebAuthnSharedSignerContractAddress, threshold],
                }),
                op: 0,
            }
        );
    } else if (isImport) {
        transactions.push({
            to: smartAccountAddress,
            value: 0n,
            data: encodeFunctionData({
                abi: SafeAbi,
                functionName: "addOwnerWithThreshold",
                args: [eoaSigner?.address, threshold],
            }),
            op: 0,
        });
    }

    return encodeFunctionData({
        abi: MultiSendContractABI,
        functionName: "multiSend",
        args: [encodeMultiSendTransactions(transactions)],
    });
};

const connectToLegacySigner = async ({
    isWebAuthnCompatible,
    legacyApi,
    smartAccountAddress,
    chain,
    encryptionSalt,
}: {
    isWebAuthnCompatible: boolean;
    legacyApi: LEGACY_API;
    smartAccountAddress: Address;
    chain: Chain;
    encryptionSalt?: string;
}): Promise<ComethSigner> => {
    if (isWebAuthnCompatible) {
        const passkey = await getLegacySigner({
            API: legacyApi,
            walletAddress: smartAccountAddress,
            chain,
        });

        return {
            type: "passkey",
            passkey: {
                id: passkey.publicKeyId as Hex,
                pubkeyCoordinates: {
                    x: passkey.publicKeyX as Hex,
                    y: passkey.publicKeyY as Hex,
                },
                signerAddress: passkey.signerAddress as Address,
            },
        };
    }
    return {
        type: "localWallet",
        eoaFallback: await getFallbackEoaSigner({
            smartAccountAddress,
            encryptionSalt: encryptionSalt,
        }),
    };
};

const create4337Signer = async ({
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

const importWalletToApiAndSetStorage = async ({
    passkey,
    api,
    smartAccountAddress,
    chain,
    signerAddress,
}: {
    passkey?: PasskeyLocalStorageFormat;
    api: API;
    smartAccountAddress: Address;
    chain: Chain;
    signerAddress: Address;
}) => {
    await api.importExternalSafe({
        smartAccountAddress,
        publicKeyId: passkey?.id as Hex,
        publicKeyY: passkey?.pubkeyCoordinates.x as Hex,
        publicKeyX: passkey?.pubkeyCoordinates.y as Hex,
        deviceData: getDeviceData() as DeviceData,
        signerAddress: signerAddress as Address,
        chainId: chain.id.toString(),
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
};

const waitForTransactionRelayAndImport = async ({
    relayTx,
    legacyApi,
    api,
    smartAccountAddress,
    chain,
    safeWebAuthnSharedSignerContractAddress,
    passkey,
    eoaSigner,
}: {
    relayTx: RelayedTransaction;
    legacyApi: LEGACY_API;
    api: API;
    smartAccountAddress: Address;
    chain: Chain;
    safeWebAuthnSharedSignerContractAddress: Address;
    passkey?: PasskeyLocalStorageFormat;
    eoaSigner?: PrivateKeyAccount;
}): Promise<void> => {
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

        relayedTransaction = await legacyApi.getRelayedTransaction(
            relayTx.relayId
        );

        if (relayedTransaction?.status.confirmed) {
            await importWalletToApiAndSetStorage({
                passkey,
                api,
                smartAccountAddress,
                chain,
                signerAddress: passkey
                    ? safeWebAuthnSharedSignerContractAddress
                    : (eoaSigner?.address as Address),
            });
        }
    }

    if (!relayedTransaction?.status.confirmed)
        throw new RelayedTransactionError();
};

export type createSafeSmartAccountParameters = Prettify<{
    apiKeyLegacy: string;
    apiKey4337: string;
    chain: Chain;
    rpcUrl?: string;
    smartAccountAddress?: Address;
    comethSignerConfig?: ComethSignerConfig;
    isImport?: boolean;
}>;

/**
 * Create a Safe smart account
 * @param apiKey - The API key for authentication
 * @param rpcUrl - Optional RPC URL for the blockchain network
 * @param smartAccountAddress - Optional address of an existing smart account
- * @returns A SafeSmartAccount instance
 */
export async function createLegacySafeSmartAccount<
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKeyLegacy,
    apiKey4337,
    chain,
    rpcUrl,
    smartAccountAddress,
    comethSignerConfig,
    isImport = false,
}: createSafeSmartAccountParameters): Promise<
    LegacySafeSmartAccount<TTransport, TChain>
> {
    if (!smartAccountAddress) throw new Error("Account address not found");

    const legacyApi = new LEGACY_API(apiKeyLegacy);
    const api = new API(apiKey4337);

    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const [client, projectParams, isWebAuthnCompatible] = await Promise.all([
        getViemClient(chain, rpcUrl) as Client<TTransport, TChain, undefined>,
        getProjectParamsByChain({ api: new API(apiKey4337), chain }),
        isDeviceCompatibleWithPasskeys({ webAuthnOptions: {} }),
    ]);

    const {
        safeWebAuthnSharedSignerContractAddress,
        p256Verifier,
        safe4337ModuleAddress,
        migrationContractAddress,
    } = projectParams.safeContractParams;

    if (!migrationContractAddress) {
        throw new Error(
            "Migration contract address not available for this network"
        );
    }

    let signer: ComethSigner;

    if (isImport) {
        signer = await create4337Signer({
            isWebAuthnCompatible,
            api,
            comethSignerConfig: comethSignerConfig,
            safeWebAuthnSharedSignerContractAddress:
                safeWebAuthnSharedSignerContractAddress,
        });
    } else {
        signer = await connectToLegacySigner({
            isWebAuthnCompatible,
            legacyApi,
            smartAccountAddress,
            chain,
            encryptionSalt: comethSignerConfig?.encryptionSalt,
        });
    }

    const passkey =
        signer.type === "passkey"
            ? (signer.passkey as PasskeyLocalStorageFormat)
            : undefined;
    const eoaSigner =
        signer.type === "localWallet"
            ? (signer.eoaFallback.signer as PrivateKeyAccount)
            : undefined;

    const safeSigner = await comethSignerToSafeSigner<TTransport, TChain>(
        client,
        {
            smartAccountAddress,
            passkey,
            eoaSigner,
        }
    );

    const smartAccount = toLegacySmartAccount({
        address: smartAccountAddress,
        async signMessage() {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async signTransaction() {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async signTypedData() {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async prepareImportSafeTx(): Promise<SafeTransactionDataPartial> {
            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                smartAccountAddress
            );

            if (isDeployed) {
                const currentVersion = await publicClient.readContract({
                    address: smartAccountAddress,
                    abi: SafeAbi,
                    functionName: "VERSION",
                });

                if (currentVersion !== "1.3.0") {
                    throw new Error(
                        `Safe is not version 1.3.0. Current version: ${currentVersion}`
                    );
                }
            }

            const threshold = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "getThreshold",
                  })) as number)
                : 1;

            const migrateCalldata = await prepareMigrationCalldata({
                threshold,
                safe4337ModuleAddress: safe4337ModuleAddress as Address,
                safeWebAuthnSharedSignerContractAddress,
                migrationContractAddress,
                p256Verifier,
                smartAccountAddress,
                passkey,
                eoaSigner,
                isImport: true,
            });

            const nonce = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "nonce",
                  })) as number)
                : 0;

            return {
                to: multisendAddress,
                value: BigInt(0).toString(),
                data: migrateCalldata,
                operation: 1,
                safeTxGas: 0,
                baseGas: 0,
                gasPrice: 0,
                gasToken: zeroAddress,
                refundReceiver: zeroAddress,
                nonce: Number(nonce),
            } as SafeTransactionDataPartial;
        },
        async importSafe({
            tx,
            signature,
        }: { tx: SafeTransactionDataPartial; signature: Hex }) {
            const relayTx = await legacyApi.relayTransaction({
                safeTxData: tx,
                signatures: signature,
                walletAddress: smartAccountAddress,
            });

            await waitForTransactionRelayAndImport({
                relayTx,
                passkey,
                eoaSigner,
                legacyApi,
                api,
                smartAccountAddress,
                chain,
                safeWebAuthnSharedSignerContractAddress,
            });

            return relayTx;
        },
        async migrate() {
            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                smartAccountAddress
            );

            if (isDeployed) {
                const currentVersion = await publicClient.readContract({
                    address: smartAccountAddress,
                    abi: SafeAbi,
                    functionName: "VERSION",
                });

                if (currentVersion !== "1.3.0") {
                    throw new Error(
                        `Safe is not version 1.3.0. Current version: ${currentVersion}`
                    );
                }
            }

            const threshold = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "getThreshold",
                  })) as number)
                : 1;

            const migrateCalldata = await prepareMigrationCalldata({
                threshold,
                safe4337ModuleAddress: safe4337ModuleAddress as Address,
                safeWebAuthnSharedSignerContractAddress,
                migrationContractAddress,
                p256Verifier,
                smartAccountAddress,
                passkey,
                eoaSigner,
            });

            const nonce = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "nonce",
                  })) as number)
                : 0;

            const tx = {
                to: multisendAddress,
                value: BigInt(0).toString(),
                data: migrateCalldata,
                operation: 1,
                safeTxGas: 0,
                baseGas: 0,
                gasPrice: 0,
                gasToken: zeroAddress,
                refundReceiver: zeroAddress,
                nonce: Number(nonce),
            } as SafeTransactionDataPartial;

            // biome-ignore lint/suspicious/noExplicitAny: TODO
            const signature = await safeSigner.signTransaction(tx as any);

            const relayTx = await legacyApi.relayTransaction({
                safeTxData: tx,
                signatures: signature,
                walletAddress: smartAccountAddress,
            });

            await waitForTransactionRelayAndImport({
                relayTx,
                passkey,
                eoaSigner,
                legacyApi,
                api,
                smartAccountAddress,
                chain,
                safeWebAuthnSharedSignerContractAddress,
            });

            return relayTx;
        },
        async hasMigrated() {
            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                smartAccountAddress
            );
            if (!isDeployed) {
                console.debug("Wallet is not deployed");
                return false;
            }

            const version = await publicClient.readContract({
                address: smartAccountAddress,
                abi: SafeAbi,
                functionName: "VERSION",
            });

            if (version !== "1.4.1") {
                console.debug(`Version is still ${version}`);
                return false;
            }

            const isModuleEnabled = await publicClient.readContract({
                address: smartAccountAddress,
                abi: SafeAbi,
                functionName: "isModuleEnabled",
                args: [safe4337ModuleAddress],
            });

            if (!isModuleEnabled) {
                console.debug("4337 module not enabled");
                return false;
            }

            return true;
        },
        client: client,
        source: "safeLegacySmartAccount",
    });

    return {
        ...smartAccount,
    };
}
