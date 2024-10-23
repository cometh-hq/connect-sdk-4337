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
    zeroAddress,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "@/core/services/API";

import type { ComethSignerConfig, Signer } from "@/core/signers/types";

import { MultiSendContractABI } from "@/core/accounts/safe/abi/Multisend";
import { MigrationAbi } from "@/core/accounts/safe/abi/migration";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import {
    DEFAULT_BASE_GAS,
    DEFAULT_REWARD_PERCENTILE,
    encodeMultiSendTransactions,
    getGasPrice,
} from "@/core/accounts/safe/services/safe";
import { getViemClient } from "@/core/accounts/utils";
import { getProjectParamsByChain } from "@/core/services/comethService";
import { isDeviceCompatibleWithPasskeys } from "@/core/signers/createSigner";
import { getFallbackEoaSigner } from "@/core/signers/ecdsa/fallbackEoa/fallbackEoaSigner";
import type { webAuthnOptions } from "@/core/signers/passkeys/types";
import type { EntryPoint } from "permissionless/_types/types";
import { comethSignerToSafeSigner } from "./safeLegacySigner/comethSignerToSafeSigner";
import { LEGACY_API } from "./services/LEGACY_API";
import { getSigner } from "./signers/passkeyService";
import type { SafeTransactionDataPartial } from "./types";
import { toLegacySmartAccount } from "./utils";

const migrationContract = "0x226194Ee67a4b85912a44b3b131b9a0ae8406711" as const;

export type SafeSmartAccount<
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "safeLegacySmartAccount", transport, chain>;

export type createSafeSmartAccountParameters = Prettify<{
    apiKey: string;
    chain: Chain;
    rpcUrl?: string;
    baseUrl?: string;
    smartAccountAddress?: Address;
    comethSignerConfig?: ComethSignerConfig;
    signer?: Signer;
}>;

/**
 * Create a Safe smart account
 * @param apiKey - The API key for authentication
 * @param rpcUrl - Optional RPC URL for the blockchain network
 * @param baseUrl - Optional base URL for the API
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
    baseUrl,
    smartAccountAddress,
    comethSignerConfig,
}: createSafeSmartAccountParameters): Promise<
    SafeSmartAccount<entryPoint, TTransport, TChain>
> {
    if (!smartAccountAddress) throw new Error("Account address not found");

    const legacyApi = new LEGACY_API(apiKey, baseUrl);

    const api = new API(apiKey, baseUrl);

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

    const { multisendAddress, safe4337ModuleAddress } = (
        await getProjectParamsByChain({ api, chain })
    ).safeContractParams;

    const isWebAuthnCompatible = await isDeviceCompatibleWithPasskeys({
        webAuthnOptions: comethSignerConfig?.webAuthnOptions as webAuthnOptions,
    });

    let publicKeyId: Hex | undefined;
    let signerAddress: Address;
    let eoaSigner;

    if (isWebAuthnCompatible) {
        const res = await getSigner({
            API: legacyApi,
            walletAddress: smartAccountAddress,
            chain,
        });

        publicKeyId = res.publicKeyId;
        signerAddress = res.signerAddress;
    } else {
        const res = await getFallbackEoaSigner({
            smartAccountAddress: smartAccountAddress,
            encryptionSalt: comethSignerConfig?.encryptionSalt,
        });

        signerAddress = res.signer.address;
        eoaSigner = res.signer;
    }

    const safeSigner = await comethSignerToSafeSigner<TTransport, TChain>(
        client,
        {
            signerAddress,
            smartAccountAddress,
            publicKeyId,
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
        async migrate(_tx: SafeTransactionDataPartial) {
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
                    to: migrationContract,
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

            const multiSendData = encodeFunctionData({
                abi: MultiSendContractABI,
                functionName: "multiSend",
                args: [encodeMultiSendTransactions(transactions)],
            });

            const nonce = (await publicClient.readContract({
                address: smartAccountAddress,
                abi: SafeAbi,
                functionName: "nonce",
            })) as number;

            const gasPrice = await getGasPrice(
                publicClient,
                DEFAULT_REWARD_PERCENTILE
            );

            const tx = {
                to: multisendAddress,
                value: BigInt(0).toString(),
                data: multiSendData,
                operation: 1, // DelegateCall
                safeTxGas: 500000,
                baseGas: DEFAULT_BASE_GAS,
                gasPrice: Number(gasPrice),
                gasToken: getAddress(zeroAddress),
                refundReceiver: getAddress(zeroAddress),
                nonce: Number(nonce),
            } as SafeTransactionDataPartial;

            const signature = await this.signTransaction(tx as any);

            return await legacyApi.relayTransaction({
                safeTxData: tx,
                signatures: signature,
                walletAddress: smartAccountAddress,
            });
        },
        async hasMigrated() {
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
