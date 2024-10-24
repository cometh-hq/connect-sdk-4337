import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type PrivateKeyAccount,
    type PublicClient,
    type SignableMessage,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    getAddress,
    hexToBigInt,
    pad,
    zeroAddress,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";

import type { ComethSignerConfig } from "@/core/signers/types";

import { MultiSendContractABI } from "@/core/accounts/safe/abi/Multisend";
import { MigrationAbi } from "@/core/accounts/safe/abi/migration";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { SafeWebAuthnSharedSignerAbi } from "@/core/accounts/safe/abi/sharedWebAuthnSigner";
import { encodeMultiSendTransactions } from "@/core/accounts/safe/services/safe";
import { SAFE_SENTINEL_OWNERS } from "@/core/accounts/safe/types";
import { getViemClient } from "@/core/accounts/utils";
import { getProjectParamsByChain } from "@/core/services/comethService";
import { isDeviceCompatibleWithPasskeys } from "@/core/signers/createSigner";
import { getFallbackEoaSigner } from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import { setPasskeyInStorage } from "@/core/signers/passkeys/passkeyService";
import { RelayedTransactionError } from "@/errors";
import { isSmartAccountDeployed } from "permissionless";
import { comethSignerToSafeSigner } from "./safeLegacySigner/comethSignerToSafeSigner";
import { LEGACY_API } from "./services/LEGACY_API";
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
const multisendAddress = "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761";

export type LegacySafeSmartAccount<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = LocalAccount<string> & {
    client: Client<transport, chain>;
    migrate: () => Promise<RelayedTransaction>;
    hasMigrated: () => Promise<boolean>;
};

const prepareMigrationCalldata = async ({
    publicClient,
    isDeployed,
    threshold,
    safe4337ModuleAddress,
    safeWebAuthnSharedSignerContractAddress,
    migrationContractAddress,
    p256Verifier,
    smartAccountAddress,
    passkeySigner,
}: {
    publicClient: PublicClient;
    isDeployed: boolean;
    threshold: number;
    safe4337ModuleAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    migrationContractAddress: Address;
    p256Verifier: Address;
    smartAccountAddress: Address;
    passkeySigner?: WebAuthnSigner;
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

    if (passkeySigner) {
        const prevOwner = await getPreviousOwner({
            isDeployed,
            safeWebAuthnSharedSignerContractAddress,
            publicClient,
            smartAccountAddress,
            passkeySigner,
        });

        transactions.push(
            {
                to: safeWebAuthnSharedSignerContractAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: SafeWebAuthnSharedSignerAbi,
                    functionName: "configure",
                    args: [
                        {
                            x: hexToBigInt(passkeySigner!.publicKeyX as Hex),
                            y: hexToBigInt(passkeySigner!.publicKeyY as Hex),
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
            },
            {
                to: smartAccountAddress,
                value: 0n,
                data: encodeFunctionData({
                    abi: SafeAbi,
                    functionName: "removeOwner",
                    args: [prevOwner, passkeySigner!.signerAddress, threshold],
                }),
                op: 0,
            }
        );
    }

    return encodeFunctionData({
        abi: MultiSendContractABI,
        functionName: "multiSend",
        args: [encodeMultiSendTransactions(transactions)],
    });
};

const getPreviousOwner = async ({
    isDeployed,
    safeWebAuthnSharedSignerContractAddress,
    publicClient,
    smartAccountAddress,
    passkeySigner,
}: {
    isDeployed: boolean;
    safeWebAuthnSharedSignerContractAddress: Address;
    publicClient: PublicClient;
    smartAccountAddress: Address;
    passkeySigner: WebAuthnSigner;
}): Promise<Address> => {
    let prevOwner: Address = safeWebAuthnSharedSignerContractAddress;

    if (isDeployed) {
        const owners = (await publicClient.readContract({
            address: smartAccountAddress as Address,
            abi: SafeAbi,
            functionName: "getOwners",
        })) as Address[];

        const index = owners.findIndex(
            (ownerToFind) => ownerToFind === passkeySigner!.signerAddress
        );

        if (index === -1) {
            throw new Error(
                `${passkeySigner!.signerAddress} is not a safe owner`
            );
        }

        if (index !== 0) {
            prevOwner = getAddress(owners[index - 1]);
        } else {
            prevOwner = getAddress(pad(SAFE_SENTINEL_OWNERS, { size: 20 }));
        }
    }

    return prevOwner;
};

const importWalletToApiAndSetStorage = async ({
    passkeySigner,
    api,
    smartAccountAddress,
    chain,
    signerAddress,
}: {
    passkeySigner?: WebAuthnSigner;
    api: API;
    smartAccountAddress: Address;
    chain: Chain;
    signerAddress: Address;
}) => {
    await api.importExternalSafe({
        smartAccountAddress,
        publicKeyId: passkeySigner?.publicKeyId as Hex,
        publicKeyY: passkeySigner?.publicKeyY as Hex,
        publicKeyX: passkeySigner?.publicKeyX as Hex,
        deviceData: passkeySigner?.deviceData as DeviceData,
        signerAddress: signerAddress as Address,
        chainId: chain.id.toString(),
    });

    if (passkeySigner) {
        setPasskeyInStorage(
            smartAccountAddress as Address,
            passkeySigner.publicKeyId as Hex,
            passkeySigner.publicKeyX as Hex,
            passkeySigner.publicKeyY as Hex,
            signerAddress as Address
        );
    }
};

export type createSafeSmartAccountParameters = Prettify<{
    apiKeyLegacy: string;
    apiKey4337: string;
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
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKeyLegacy,
    apiKey4337,
    chain,
    rpcUrl,
    smartAccountAddress,
    comethSignerConfig,
}: createSafeSmartAccountParameters): Promise<
    LegacySafeSmartAccount<TTransport, TChain>
> {
    if (!smartAccountAddress) throw new Error("Account address not found");

    const legacyApi = new LEGACY_API(apiKeyLegacy);
    const api = new API(apiKey4337);

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

    let eoaSigner: PrivateKeyAccount | undefined;
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
        async signTransaction(_tx) {
            return safeSigner.signTransaction(_tx);
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

            const threshold = isDeployed
                ? ((await publicClient.readContract({
                      address: smartAccountAddress,
                      abi: SafeAbi,
                      functionName: "getThreshold",
                  })) as number)
                : 1;

            const migrateCalldata = await prepareMigrationCalldata({
                publicClient,
                isDeployed,
                threshold,
                safe4337ModuleAddress: safe4337ModuleAddress as Address,
                safeWebAuthnSharedSignerContractAddress,
                migrationContractAddress,
                p256Verifier,
                smartAccountAddress,
                passkeySigner,
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
            const signature = await this.signTransaction(tx as any);

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
                await new Promise((resolve) => setTimeout(resolve, 4000));

                relayedTransaction = await legacyApi.getRelayedTransaction(
                    relayTx.relayId
                );

                if (relayedTransaction?.status.confirmed) {
                    await importWalletToApiAndSetStorage({
                        passkeySigner,
                        api,
                        smartAccountAddress,
                        chain,
                        signerAddress: passkeySigner ? safeWebAuthnSharedSignerContractAddress : eoaSigner?.address as Address,
                    });
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
    };
}
