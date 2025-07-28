import { defaultClientConfig } from "@/constants";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    prepareImportCalldata,
    prepareLegacyMigrationCalldata,
} from "@/core/accounts/safe/services/safe";
import type { SafeContractParams } from "@/core/accounts/safe/types";
import type { API } from "@/core/services/API";
import { isDeviceCompatibleWithPasskeys } from "@/core/signers/createSigner";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import {
    ImportOnUndeployedSafeError,
    SafeVersionNotSupportedError,
    WalletAlreadyImportedError,
} from "@/errors";
import type { SafeTransactionDataPartial } from "@/migrationKit/types";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type PrivateKeyAccount,
    type Transport,
    createPublicClient,
    zeroAddress,
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
    prepareImportSafe1_1Tx: () => Promise<{
        tx: SafeTransactionDataPartial;
        passkey?: PasskeyLocalStorageFormat;
        eoaSigner?: PrivateKeyAccount;
    }>;
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
    signTransactionByExternalOwnerFor1_1: ({
        signer,
        tx,
    }: {
        signer: PrivateKeyAccount;
        tx: SafeTransactionDataPartial;
    }) => Promise<Hex | undefined>;
};

export function importSafeActions() {
    return <
        TAccount extends ComethSafeSmartAccount | undefined =
            | ComethSafeSmartAccount
            | undefined,
    >(
        client: Client<Transport, Chain | undefined, TAccount>
    ): SafeImportActions => {
        return {
            // Prepare import transaction for Safe v1.1.1
            prepareImportSafe1_1Tx: async () => {
                const rpcClient =
                    client.account?.publicClient ??
                    createPublicClient({
                        chain: client.chain,
                        transport: http(),
                        ...defaultClientConfig,
                    });

                const isDeployed = await isSmartAccountDeployed(
                    rpcClient,
                    client.account?.address as Address
                );

                if (!isDeployed) {
                    throw new ImportOnUndeployedSafeError();
                }

                const api = client?.account?.connectApiInstance as API;
                const comethSignerConfig = client?.account?.comethSignerConfig;
                const contractParams = client?.account?.safeContractParams;

                let threshold: number;
                let nonce: bigint;
                let currentVersion: string;

                if (isDeployed) {
                    [currentVersion, threshold, nonce] = (await Promise.all([
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
                            functionName: "nonce",
                        }),
                    ])) as [string, number, bigint];

                    if (currentVersion !== "1.1.1") {
                        throw new SafeVersionNotSupportedError(
                            "1.1.1",
                            currentVersion
                        );
                    }
                } else {
                    threshold = 1;
                    nonce = 0n;
                }

                const isWebAuthnCompatible =
                    await isDeviceCompatibleWithPasskeys({
                        webAuthnOptions: {},
                    });

                const signer = await create4337Signer({
                    api,
                    isWebAuthnCompatible,
                    comethSignerConfig,
                    safeWebAuthnSharedSignerContractAddress:
                        contractParams?.safeWebAuthnSharedSignerContractAddress as Address,
                });

                const { passkey, eoaSigner } =
                    extractComethSignerParams(signer);

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
                    is4337ModuleEnabled: false,
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
            // Prepare import transaction for Safe v1.3.0
            prepareImportSafe1_3Tx: async () => {
                const rpcClient =
                    client.account?.publicClient ??
                    createPublicClient({
                        chain: client.chain,
                        transport: http(),
                        ...defaultClientConfig,
                    });

                const isDeployed = await isSmartAccountDeployed(
                    rpcClient,
                    client.account?.address as Address
                );

                if (!isDeployed) {
                    throw new ImportOnUndeployedSafeError();
                }

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
                        throw new SafeVersionNotSupportedError(
                            "1.3.0",
                            currentVersion
                        );
                    }
                } else {
                    threshold = 1;
                    is4337ModuleEnabled = false;
                    nonce = 0n;
                }

                const isWebAuthnCompatible =
                    await isDeviceCompatibleWithPasskeys({
                        webAuthnOptions: {},
                    });

                const signer = await create4337Signer({
                    api,
                    isWebAuthnCompatible,
                    comethSignerConfig,
                    safeWebAuthnSharedSignerContractAddress:
                        contractParams?.safeWebAuthnSharedSignerContractAddress as Address,
                });

                const { passkey, eoaSigner } =
                    extractComethSignerParams(signer);

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

            // Prepare import transaction for Safe v1.4.1
            prepareImportSafe1_4Tx: async () => {
                const rpcClient =
                    client.account?.publicClient ??
                    createPublicClient({
                        chain: client.chain,
                        transport: http(),
                        ...defaultClientConfig,
                    });

                const isDeployed = await isSmartAccountDeployed(
                    rpcClient,
                    client.account?.address as Address
                );

                if (!isDeployed) {
                    throw new ImportOnUndeployedSafeError();
                }

                const api = client?.account?.connectApiInstance as API;
                const comethSignerConfig = client?.account?.comethSignerConfig;
                const contractParams = client?.account?.safeContractParams;

                const importedWallet = await api.getWalletByNetworks(
                    client?.account?.address as Address
                );

                if (importedWallet?.length > 0) {
                    throw new WalletAlreadyImportedError();
                }

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
                        throw new SafeVersionNotSupportedError(
                            "1.4.1",
                            currentVersion
                        );
                    }
                } else {
                    threshold = 1;
                    is4337ModuleEnabled = false;
                    nonce = 0n;
                }

                const isWebAuthnCompatible =
                    await isDeviceCompatibleWithPasskeys({
                        webAuthnOptions: {},
                    });

                const signer = await create4337Signer({
                    api,
                    isWebAuthnCompatible,
                    comethSignerConfig,
                    safeWebAuthnSharedSignerContractAddress:
                        contractParams?.safeWebAuthnSharedSignerContractAddress as Address,
                });

                const { passkey, eoaSigner } =
                    extractComethSignerParams(signer);

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

            // Import Safe with transaction and signature
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

            // Sign transaction by external owner
            signTransactionByExternalOwner: async (args) => {
                const { signer, tx } = args;

                const rpcClient =
                    client.account?.publicClient ??
                    createPublicClient({
                        chain: client.chain,
                        transport: http(),
                        ...defaultClientConfig,
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

            signTransactionByExternalOwnerFor1_1: async (args) => {
                const { signer, tx } = args;

                const domain = {
                    verifyingContract: client.account?.address as Address,
                };

                const types = {
                    SafeTx: [
                        { name: "to", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "data", type: "bytes" },
                        { name: "operation", type: "uint8" },
                        { name: "safeTxGas", type: "uint256" },
                        { name: "baseGas", type: "uint256" },
                        { name: "gasPrice", type: "uint256" },
                        { name: "gasToken", type: "address" },
                        { name: "refundReceiver", type: "address" },
                        { name: "nonce", type: "uint256" },
                    ],
                };

                return await signer.signTypedData({
                    domain,
                    types,
                    primaryType: "SafeTx",
                    message: tx as unknown as Record<string, unknown>,
                });
            },
        };
    };
}
