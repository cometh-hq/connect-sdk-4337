import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type PrivateKeyAccount,
    type PublicClient,
    type Transport,
    createPublicClient,
    zeroAddress,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";

import type { ComethSigner, ComethSignerConfig } from "@/core/signers/types";

import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { prepareLegacyMigrationCalldata } from "@/core/accounts/safe/services/safe";
import { getViemClient } from "@/core/accounts/utils";
import {
    create4337Signer,
    createCalldataAndImport,
    extractComethSignerParams,
    signTypedData,
    waitForTransactionRelayAndImport,
} from "@/core/actions/accounts/safe/importSafe/utils";
import { getProjectParamsByChain } from "@/core/services/comethService";
import { isDeviceCompatibleWithPasskeys } from "@/core/signers/createSigner";
import { getFallbackEoaSigner } from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import { isSmartAccountDeployed } from "permissionless";
import { comethSignerToSafeSigner } from "./safeLegacySigner/comethSignerToSafeSigner";
import { LEGACY_API } from "./services/LEGACY_API";
import { getLegacyProjectParams } from "./services/comethService";
import { getLegacySafeDeploymentData } from "./services/safe";
import { getLegacySigner } from "./signers/passkeyService";
import type { SafeTransactionDataPartial } from "./types";

const multisendAddress = "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761";

const legacyAddress = {
    guardianId: "COMETH",
    legacySingletonAddress:
        "0x3E5c63644E683549055b9Be8653de26E0B4CD36E" as Address,
    legacySafeProxyFactoryAddress:
        "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2" as Address,
    legacyFallbackHandler:
        "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4" as Address,
};

export type LegacySafeSmartAccount<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = {
    address: Address;
    client: Client<transport, chain>;
    migrate: () => Promise<Hex | undefined>;
    hasMigrated: () => Promise<boolean>;
    legacySignTransaction: ({
        signer,
        tx,
    }: {
        signer: PrivateKeyAccount;
        tx: SafeTransactionDataPartial;
    }) => Promise<Hex>;
    signTransaction: (transaction: SafeTransactionDataPartial) => Promise<Hex>;
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

export type createSafeSmartAccountParameters = Prettify<{
    apiKeyLegacy: string;
    apiKey4337: string;
    chain: Chain;
    smartAccountAddress?: Address;
    comethSignerConfig?: ComethSignerConfig;
    isImport?: boolean;
    baseUrl: string;
    publicClient: PublicClient;
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
    smartAccountAddress,
    comethSignerConfig,
    isImport = false,
    baseUrl,
    publicClient,
}: createSafeSmartAccountParameters): Promise<
    LegacySafeSmartAccount<TTransport, TChain>
> {
    if (!smartAccountAddress) throw new Error("Account address not found");

    const legacyApi = new LEGACY_API(apiKeyLegacy);
    const api = new API(apiKey4337, baseUrl);

    publicClient =
        publicClient ??
        createPublicClient({
            chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });

    const [client, projectParams, legacyProjectParams, isWebAuthnCompatible] =
        await Promise.all([
            getViemClient(chain, publicClient.transport.url) as Client<
                TTransport,
                TChain,
                undefined
            >,
            getProjectParamsByChain({ api, chain }),
            getLegacyProjectParams({ legacyApi }),
            isDeviceCompatibleWithPasskeys({ webAuthnOptions: {} }),
        ]);

    const {
        safeWebAuthnSharedSignerContractAddress,
        p256Verifier,
        safe4337ModuleAddress,
        migrationContractAddress,
    } = projectParams.safeContractParams;

    const {
        P256FactoryContractAddress: legacyP256FactoryAddress,
        deploymentManagerAddress,
    } = legacyProjectParams;

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

    const { passkey, eoaSigner } = extractComethSignerParams(signer);

    const safeSigner = await comethSignerToSafeSigner<TTransport, TChain>(
        client,
        {
            smartAccountAddress,
            passkey,
            eoaSigner,
        }
    );

    return {
        address: smartAccountAddress,
        async signTransaction(tx: SafeTransactionDataPartial): Promise<Hex> {
            // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
            return await safeSigner.signTransaction(tx as any);
        },
        async legacySignTransaction({
            signer,
            tx,
        }: {
            signer: PrivateKeyAccount;
            tx: SafeTransactionDataPartial;
        }): Promise<Hex> {
            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                smartAccountAddress
            );

            const nonce = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "nonce",
                  })) as bigint)
                : BigInt(0);

            return signTypedData({
                signer,
                chainId: client.chain?.id as number,
                verifyingContract: smartAccountAddress,
                tx,
                nonce,
            });
        },

        async migrate(): Promise<Hex | undefined> {
            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                smartAccountAddress
            );

            let threshold: number;
            let is4337ModuleEnabled: boolean;
            let nonce: bigint;
            let currentVersion: string;

            if (isDeployed) {
                [currentVersion, threshold, is4337ModuleEnabled, nonce] =
                    (await Promise.all([
                        publicClient.readContract({
                            address: smartAccountAddress,
                            abi: SafeAbi,
                            functionName: "VERSION",
                        }),
                        publicClient.readContract({
                            address: smartAccountAddress,
                            abi: SafeAbi,
                            functionName: "getThreshold",
                        }),
                        publicClient.readContract({
                            address: smartAccountAddress,
                            abi: SafeAbi,
                            functionName: "isModuleEnabled",
                            args: [safe4337ModuleAddress as Address],
                        }),
                        publicClient.readContract({
                            address: smartAccountAddress,
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

            let deploymentTx:
                | {
                      to: `0x${string}`;
                      data: `0x${string}`;
                      value: number;
                      op: number;
                  }[]
                | undefined;

            if (!isDeployed) {
                deploymentTx = await getLegacySafeDeploymentData({
                    ownerAddress: smartAccountAddress,
                    safeProxyFactoryAddress:
                        legacyAddress.legacySafeProxyFactoryAddress,
                    safeSingletonAddress: legacyAddress.legacySingletonAddress,
                    deploymentManagerAddress:
                        deploymentManagerAddress as Address,
                    fallbackHandler: legacyAddress.legacyFallbackHandler,
                    guardianId: legacyAddress.guardianId,
                    legacyP256FactoryAddress:
                        legacyP256FactoryAddress as Address,
                    passkey,
                });
            }

            const migrateCalldata = await prepareLegacyMigrationCalldata({
                threshold,
                safe4337ModuleAddress: safe4337ModuleAddress as Address,
                safeWebAuthnSharedSignerContractAddress,
                migrationContractAddress,
                p256Verifier,
                smartAccountAddress,
                passkey,
                eoaSigner,
                is4337ModuleEnabled,
                ...deploymentTx,
            });

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

            const relayId = await createCalldataAndImport({
                api,
                smartAccountAddress,
                chainId: client.chain?.id as number,
                contractParams: projectParams.safeContractParams,
                tx,
                signature,
                passkey,
                eoaSigner,
            });

            const txHash = await waitForTransactionRelayAndImport({
                relayId,
                api,
                chainId: client.chain?.id as number,
            });

            return txHash;
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
    };
}
