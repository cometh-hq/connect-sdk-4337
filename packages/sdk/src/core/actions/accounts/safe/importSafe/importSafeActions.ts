import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";

import {
    prepareImportCalldata,
    prepareLegacyMigrationCalldata,
} from "@/core/accounts/safe/services/safe";
import type { API } from "@/core/services/API";
import { isDeviceCompatibleWithPasskeys } from "@/core/signers/createSigner";

import type { SafeContractParams } from "@/core/accounts/safe/types";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import type { SafeTransactionDataPartial } from "@/migrationKit/types";
import {
    type SmartAccountClient,
    isSmartAccountDeployed,
} from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    createPublicClient,
    zeroAddress,
    type Client,
} from "viem";
import {
    create4337Signer,
    createCalldataAndImport,
    extractComethSignerParams,
    signTypedData,
    waitForTransactionRelayAndImport,
} from "./utils";

const multisendAddress = "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761";

export type SafeImportActions = {
    prepareImportSafe1_3Tx: () => Promise<{
        tx: SafeTransactionDataPartial;
        passkey?: PasskeyLocalStorageFormat;
        eoaSigner?: PrivateKeyAccount;
    }>;
    prepareImportSafe1_4Tx: () => Promise<{
        tx: SafeTransactionDataPartial;
        passkey?: PasskeyLocalStorageFormat;
        eoaSigner?: PrivateKeyAccount;
    }>;
    importSafe: ({
        tx,
        signature,
        passkey,
        eoaSigner,
    }: {
        tx: SafeTransactionDataPartial;
        signature: Hex;
        passkey?: PasskeyLocalStorageFormat;
        eoaSigner?: PrivateKeyAccount;
    }) => Promise<Hex | undefined>;
    signTransactionByExternalOwner: ({
        signer,
        tx,
    }: {
        signer: PrivateKeyAccount;
        tx: SafeTransactionDataPartial;
    }) => Promise<Hex | undefined>;
};

export const importSafeActions =
    (publicClient?: PublicClient) =>
        <
            transport extends Transport,
            chain extends Chain | undefined = undefined,
            account extends ComethSafeSmartAccount | undefined = undefined,
            client extends Client | undefined = undefined,
        >(
            client: SmartAccountClient<
                transport,
                chain,
                account,
                client
            >
        ): SafeImportActions => ({
            prepareImportSafe1_3Tx: async () => {
                const rpcClient =
                    publicClient ??
                    createPublicClient({
                        chain: client.chain,
                        transport: http(),
                        cacheTime: 60_000,
                        batch: {
                            multicall: { wait: 50 },
                        },
                    });

                const isDeployed = await isSmartAccountDeployed(
                    rpcClient,
                    client.account?.address as Address
                );

                if (!isDeployed)
                    throw new Error("Import can only be done on deployed safe");

                const api = client?.account?.connectApiInstance as API;
                const comethSignerConfig = client?.account?.comethSignerConfig;
                const contractParams = client?.account?.safeContractParams;

                let threshold: number;
                let is4337ModuleEnabled: boolean;
                let nonce: bigint;
                let currentVersion: string;

                if (isDeployed) {
                    [currentVersion, threshold, is4337ModuleEnabled, nonce] =
                        (await Promise.all([
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "VERSION",
                            }),
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "getThreshold",
                            }),
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "isModuleEnabled",
                                args: [
                                    contractParams?.safe4337ModuleAddress as Address,
                                ],
                            }),
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "nonce",
                            }),
                        ])) as [string, number, boolean, bigint];

                    if (currentVersion !== "1.3.0") {
                        throw new Error(
                            `Safe is not version 1.3.0. Current version: ${currentVersion}`
                        );
                    }
                } else {
                    threshold = 1;
                    is4337ModuleEnabled = false;
                    nonce = 0n;
                }

                const isWebAuthnCompatible = await isDeviceCompatibleWithPasskeys({
                    webAuthnOptions: {},
                });

                const signer = await create4337Signer({
                    api,
                    isWebAuthnCompatible,
                    comethSignerConfig,
                    safeWebAuthnSharedSignerContractAddress:
                        contractParams?.safeWebAuthnSharedSignerContractAddress as Address,
                });

                const { passkey, eoaSigner } = extractComethSignerParams(signer);

                const migrateCalldata = await prepareLegacyMigrationCalldata({
                    threshold,
                    safe4337ModuleAddress:
                        contractParams?.safe4337ModuleAddress as Address,
                    safeWebAuthnSharedSignerContractAddress:
                        contractParams?.safeWebAuthnSharedSignerContractAddress as Address,
                    migrationContractAddress:
                        contractParams?.migrationContractAddress as Address,
                    p256Verifier: contractParams?.p256Verifier as Address,
                    smartAccountAddress: client.account?.address as Address,
                    passkey,
                    eoaSigner,
                    isImport: true,
                    is4337ModuleEnabled,
                });

                return {
                    tx: {
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
                    } as SafeTransactionDataPartial,
                    passkey,
                    eoaSigner,
                };
            },
            prepareImportSafe1_4Tx: async () => {
                const rpcClient =
                    publicClient ??
                    createPublicClient({
                        chain: client.chain,
                        transport: http(),
                        cacheTime: 60_000,
                        batch: {
                            multicall: { wait: 50 },
                        },
                    });

                const isDeployed = await isSmartAccountDeployed(
                    rpcClient,
                    client.account?.address as Address
                );

                if (!isDeployed)
                    throw new Error("Import can only be done on deployed safe");

                const api = client?.account?.connectApiInstance as API;
                const comethSignerConfig = client?.account?.comethSignerConfig;
                const contractParams = client?.account?.safeContractParams;

                const importedWallet = await api.getWalletByNetworks(
                    client?.account?.address as Address
                );

                if (importedWallet?.length > 0)
                    throw new Error("Wallet already imported");

                let threshold: number;
                let is4337ModuleEnabled: boolean;
                let nonce: bigint;
                let currentVersion: string;

                if (isDeployed) {
                    [currentVersion, threshold, is4337ModuleEnabled, nonce] =
                        (await Promise.all([
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "VERSION",
                            }),
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "getThreshold",
                            }),
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "isModuleEnabled",
                                args: [
                                    contractParams?.safe4337ModuleAddress as Address,
                                ],
                            }),
                            rpcClient.readContract({
                                address: client.account?.address as Address,
                                abi: SafeAbi,
                                functionName: "nonce",
                            }),
                        ])) as [string, number, boolean, bigint];

                    if (currentVersion !== "1.4.1") {
                        throw new Error(
                            `Safe is not version 1.4.1. Current version: ${currentVersion}`
                        );
                    }
                } else {
                    threshold = 1;
                    is4337ModuleEnabled = false;
                    nonce = 0n;
                }

                const isWebAuthnCompatible = await isDeviceCompatibleWithPasskeys({
                    webAuthnOptions: {},
                });

                const signer = await create4337Signer({
                    api,
                    isWebAuthnCompatible,
                    comethSignerConfig,
                    safeWebAuthnSharedSignerContractAddress:
                        contractParams?.safeWebAuthnSharedSignerContractAddress as Address,
                });

                const { passkey, eoaSigner } = extractComethSignerParams(signer);

                const migrateCalldata = await prepareImportCalldata({
                    threshold,
                    safe4337ModuleAddress:
                        contractParams?.safe4337ModuleAddress as Address,
                    safeWebAuthnSharedSignerContractAddress:
                        contractParams?.safeWebAuthnSharedSignerContractAddress as Address,
                    p256Verifier: contractParams?.p256Verifier as Address,
                    smartAccountAddress: client.account?.address as Address,
                    passkey,
                    eoaSigner,
                    isImport: true,
                    is4337ModuleEnabled,
                });

                return {
                    tx: {
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
                    } as SafeTransactionDataPartial,
                    passkey,
                    eoaSigner,
                };
            },
            importSafe: async (args) => {
                const api = client?.account?.connectApiInstance as API;
                const contractParams = client?.account
                    ?.safeContractParams as SafeContractParams;

                const relayId = await createCalldataAndImport({
                    api,
                    smartAccountAddress: client.account?.address as Address,
                    chainId: client.chain?.id as number,
                    contractParams,
                    tx: args.tx,
                    signature: args.signature,
                    passkey: args.passkey,
                    eoaSigner: args.eoaSigner,
                });

                const txHash = await waitForTransactionRelayAndImport({
                    relayId,
                    api,
                    chainId: client.chain?.id as number,
                });

                return txHash;
            },
            signTransactionByExternalOwner: async (args) => {
                const { signer, tx } = args;

                const rpcClient =
                    publicClient ??
                    createPublicClient({
                        chain: client.chain,
                        transport: http(),
                        cacheTime: 60_000,
                        batch: {
                            multicall: { wait: 50 },
                        },
                    });

                const isDeployed = await isSmartAccountDeployed(
                    rpcClient,
                    client.account?.address as Address
                );

                const nonce = isDeployed
                    ? ((await rpcClient.readContract({
                        address: client.account?.address as Address,
                        abi: SafeAbi,
                        functionName: "nonce",
                    })) as bigint)
                    : BigInt(0);

                return signTypedData({
                    signer,
                    chainId: client.chain?.id as number,
                    verifyingContract: client.account?.address as Address,
                    tx,
                    nonce,
                });
            },
        });
