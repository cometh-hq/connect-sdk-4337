import type { SmartAccount } from "permissionless/accounts";
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";

import type { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types/entrypoint";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type SignableMessage,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    getAddress,
    hexToBigInt,
    zeroAddress,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";

import type { ComethSignerConfig } from "@/core/signers/types";

import { MultiSendContractABI } from "@/core/accounts/safe/abi/Multisend";
import { MigrationAbi } from "@/core/accounts/safe/abi/migration";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { SafeWebAuthnSharedSignerAbi } from "@/core/accounts/safe/abi/sharedWebAuthnSigner";
import {
    DEFAULT_REWARD_PERCENTILE,
    encodeMultiSendTransactions,
    getGasPrice,
} from "@/core/accounts/safe/services/safe";
import { getViemClient } from "@/core/accounts/utils";
import { getProjectParamsByChain } from "@/core/services/comethService";
import { isDeviceCompatibleWithPasskeys } from "@/core/signers/createSigner";
import { getFallbackEoaSigner } from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import { setPasskeyInStorage } from "@/core/signers/passkeys/passkeyService";
import { RelayedTransactionError } from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import type { EntryPoint } from "permissionless/_types/types";
import { comethSignerToSafeSigner } from "./safeLegacySigner/comethSignerToSafeSigner";
import { LEGACY_API } from "./services/LEGACY_API";
import { WEBAUTHN_DEFAULT_BASE_GAS } from "./services/safe";
import { getSigner } from "./signers/passkeyService";
import type {
    DeviceData,
    RelayedTransaction,
    RelayedTransactionDetails,
    SafeTransactionDataPartial,
    WebAuthnSigner,
} from "./types";
import { toLegacySmartAccount } from "./utils";

// 60 secondes
const DEFAULT_CONFIRMATION_TIME = 60 * 1000;
//const migrationContractAddress = "0x226194Ee67a4b85912a44b3b131b9a0ae8406711" as const;

export type LegacySafeSmartAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "safeLegacySmartAccount", transport, chain> & {
    migrate: () => Promise<RelayedTransaction>;
    hasMigrated: () => Promise<boolean>;
};

export type createSafeSmartAccountParameters = Prettify<{
    apiKey: string;
    chain: Chain;
    rpcUrl?: string;
    smartAccountAddress?: Address;
    comethSignerConfig?: ComethSignerConfig;
}>;

/**
 * Create a Safe smart account
 * @param apiKey - The API key for authentication
 * @param rpcUrl - Optional RPC URL for the blockchain network
 * @param smartAccountAddress - Optional address of an existing smart account
- * @returns A SafeSmartAccount instance
 */
export async function createLegacySafeSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKey,
    chain,
    rpcUrl,
    smartAccountAddress,
    comethSignerConfig,
}: createSafeSmartAccountParameters): Promise<
    LegacySafeSmartAccount<entryPoint, TTransport, TChain>
> {
    if (!smartAccountAddress) throw new Error("Account address not found");

    const legacyApi = new LEGACY_API(apiKey);
    const api = new API(apiKey);

    const client = (await getViemClient(chain, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    const publicClient = createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const {
        multisendAddress,
        safe4337ModuleAddress,
        safeWebAuthnSharedSignerContractAddress,
        p256Verifier,
        migrationContractAddress,
    } = (await getProjectParamsByChain({ api, chain })).safeContractParams;

    if (!migrationContractAddress)
        throw new Error(
            "Migration contract address not available for this network"
        );

    const isWebAuthnCompatible = await isDeviceCompatibleWithPasskeys({
        webAuthnOptions: {},
    });

    let eoaSigner;
    let passkeySigner: WebAuthnSigner | undefined;

    if (isWebAuthnCompatible) {
        passkeySigner = await getSigner({
            API: legacyApi,
            walletAddress: smartAccountAddress,
            chain,
        });
    } else {
        const res = await getFallbackEoaSigner({
            smartAccountAddress: smartAccountAddress,
            encryptionSalt: comethSignerConfig?.encryptionSalt,
        });

        eoaSigner = res.signer;
    }

    const safeSigner = await comethSignerToSafeSigner<TTransport, TChain>(
        client,
        {
            smartAccountAddress,
            passkeySigner,
            eoaSigner,
        }
    );

    const smartAccount = toLegacySmartAccount({
        address: smartAccountAddress,
        async signMessage({ message }: { message: SignableMessage }) {
            return safeSigner.signMessage({ message });
        },
        async signTransaction(tx: any) {
            return safeSigner.signTransaction(tx);
        },
        async signTypedData() {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async migrate() {
            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                smartAccountAddress
            );

            if (isDeployed) {
                // 1. Verify current version
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

            // 2. Prepare migration transaction
            const migrateData = encodeFunctionData({
                abi: MigrationAbi,
                functionName: "migrateL2WithFallbackHandler",
            });

            const enableModuleData = encodeFunctionData({
                abi: SafeAbi,
                functionName: "enableModule",
                args: [safe4337ModuleAddress],
            });

            const transactions = [
                {
                    to: migrationContractAddress,
                    value: 0n,
                    data: migrateData,
                    op: 1,
                },
                {
                    to: smartAccountAddress,
                    value: 0n,
                    data: enableModuleData,
                    op: 0,
                },
            ];

            const threshold = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "getThreshold",
                  })) as number)
                : 1;

            if (passkeySigner) {
                transactions.push(
                    {
                        to: safeWebAuthnSharedSignerContractAddress,
                        value: 0n,
                        data: encodeFunctionData({
                            abi: SafeWebAuthnSharedSignerAbi,
                            functionName: "configure",
                            args: [
                                {
                                    x: hexToBigInt(
                                        passkeySigner.publicKeyX as Hex
                                    ),
                                    y: hexToBigInt(
                                        passkeySigner.publicKeyY as Hex
                                    ),
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
                            args: [
                                safeWebAuthnSharedSignerContractAddress,
                                threshold,
                            ],
                        }),
                        op: 0,
                    }
                );
            }

            const multiSendData = encodeFunctionData({
                abi: MultiSendContractABI,
                functionName: "multiSend",
                args: [encodeMultiSendTransactions(transactions)],
            });

            const nonce = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "nonce",
                  })) as number)
                : 0;

            const gasPrice = await getGasPrice(
                publicClient,
                DEFAULT_REWARD_PERCENTILE
            );

            const tx = {
                to: multisendAddress,
                value: BigInt(0).toString(),
                data: multiSendData,
                operation: 1,
                safeTxGas: 500000,
                baseGas: WEBAUTHN_DEFAULT_BASE_GAS,
                gasPrice: Number(gasPrice),
                gasToken: getAddress(zeroAddress),
                refundReceiver: getAddress(zeroAddress),
                nonce: Number(nonce),
            } as SafeTransactionDataPartial;

            const signature = await this.signTransaction(tx);

            const relayTx = await legacyApi.relayTransaction({
                safeTxData: tx,
                signatures: signature,
                walletAddress: smartAccountAddress,
            });

            const startDate = Date.now();
            const timeoutLimit = new Date(
                startDate + DEFAULT_CONFIRMATION_TIME
            ).getTime();

            let relayedTransaction: RelayedTransactionDetails | undefined =
                undefined as RelayedTransactionDetails | undefined;

            while (
                !(relayedTransaction as RelayedTransactionDetails)?.status
                    .confirmed &&
                Date.now() < timeoutLimit
            ) {
                await new Promise((resolve) => setTimeout(resolve, 3000));

                relayedTransaction = await legacyApi.getRelayedTransaction(
                    relayTx.relayId
                );

                if (relayedTransaction?.status.confirmed) {
                    await api.importExternalSafe({
                        smartAccountAddress,
                        publicKeyId: passkeySigner?.publicKeyId as Hex,
                        publicKeyY: passkeySigner?.publicKeyY as Hex,
                        publicKeyX: passkeySigner?.publicKeyX as Hex,
                        deviceData: passkeySigner?.deviceData as DeviceData,
                        signerAddress: passkeySigner?.signerAddress as Address,
                        chainId: chain.id.toString(),
                    });

                    if (passkeySigner) {
                        setPasskeyInStorage(
                            smartAccountAddress as Address,
                            passkeySigner?.publicKeyId as Hex,
                            passkeySigner?.publicKeyX as Hex,
                            passkeySigner?.publicKeyY as Hex,
                            safeWebAuthnSharedSignerContractAddress as Address
                        );
                    }
                }
            }

            if (!relayedTransaction?.status.confirmed)
                throw new RelayedTransactionError();

            return relayTx;
        },
        async hasMigrated() {
            const isDeployed = await isSmartAccountDeployed(
                publicClient,
                smartAccountAddress
            );
            if (!isDeployed) throw new Error("wallet not yet deployed");

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
    } as any;
}
