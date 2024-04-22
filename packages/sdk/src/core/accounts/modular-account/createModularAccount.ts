import {
    getAccountNonce,
    getSenderAddress,
    getUserOperationHash,
    isSmartAccountDeployed,
} from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import {
    SignTransactionNotSupportedBySmartAccount,
    toSmartAccount,
} from "permissionless/accounts";

import type { ENTRYPOINT_ADDRESS_V06_TYPE } from "permissionless/types/entrypoint";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concatHex,
    createPublicClient,
    encodeFunctionData,
    hexToBigInt,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "../../services/API";
import { getClient } from "../utils";

import { P256_SIGNER_FACTORY } from "@/constants";
import { predictSignerAddress } from "@/core/services/p256SignerService";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import type { ComethSigner } from "@/core/signers/types";
import type { EntryPoint } from "permissionless/_types/types";
import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "../../services/comethService";
import { IP256PluginDeployerAbi } from "./abis/IP256PluginDeployer";
import { IStandardExecutorAbi } from "./abis/IStandardExecutor";
import { MultiP256OwnerModularAccountFactoryAbi } from "./abis/MultiP256OwnerModularAccountFactory";
import { ECDSAMessageSigner } from "./plugins/multi-owner/signer/ECDSAsigner";
import { WebauthnMessageSigner } from "./plugins/multi-owner/webauthn/WebauthnSigner";
import type { MultiOwnerSigner } from "./plugins/types";
import { getDefaultMultiP256OwnerModularAccountFactoryAddress } from "./utils/utils";

export type ModularSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "modularSmartAccount", transport, chain>;

const encodeP256DeploymentCall = (
    _tx:
        | {
              to: `0x${string}`;
              value: bigint;
              data: `0x${string}`;
          }
        | {
              to: `0x${string}`;
              value: bigint;
              data: `0x${string}`;
          }[],
    passkey: PasskeyLocalStorageFormat
) => {
    const { x, y } = passkey.pubkeyCoordinates;

    const Calls = [
        Array.isArray(_tx)
            ? _tx.map((tx) => ({
                  target: tx.to,
                  data: tx.data,
                  value: tx.value ?? 0n,
              }))
            : {
                  target: _tx.to,
                  data: _tx.data,
                  value: _tx.value ?? 0n,
              },
    ];

    return encodeFunctionData({
        abi: IP256PluginDeployerAbi,
        functionName: "executeAndDeployPasskey",
        args: [x, y, P256_SIGNER_FACTORY, Calls],
    });
};

/**
 * Get the account initialization code for a modular smart account
 * @param signerAddress
 * @param factoryAddress
 * @param owners
 * @param salt
 */
const getAccountInitCode = async ({
    signerAddress,
    factoryAddress,
    owners,
    salt,
}: {
    signerAddress: Address;
    factoryAddress: Address;
    owners: Address[];
    salt: bigint;
}) => {
    // NOTE: the current signer connected will be one of the owners as well
    const ownerAddress = signerAddress;
    // owners need to be dedupe + ordered in ascending order and not == to zero address
    const owners_ = Array.from(new Set([...owners, ownerAddress]))
        .filter((x) => hexToBigInt(x) !== 0n)
        .sort((a, b) => {
            const bigintA = hexToBigInt(a);
            const bigintB = hexToBigInt(b);

            return bigintA < bigintB ? -1 : bigintA > bigintB ? 1 : 0;
        });

    return concatHex([
        factoryAddress,
        encodeFunctionData({
            abi: MultiP256OwnerModularAccountFactoryAbi,
            functionName: "createAccount",
            args: [salt, owners_],
        }),
    ]);
};

export const getAccountAddress = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    client,
    entryPointAddress,
    initCodeProvider,
}: {
    client: Client<TTransport, TChain, undefined>;
    entryPointAddress: Address;
    initCodeProvider: () => Promise<Hex>;
}) => {
    const initCode = await initCodeProvider();

    return getSenderAddress<ENTRYPOINT_ADDRESS_V06_TYPE>(client, {
        initCode,
        entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V06_TYPE,
    });
};

export type signerToModularSmartAccountParameters<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
> = Prettify<{
    comethSigner: ComethSigner;
    apiKey: string;
    rpcUrl?: string;
    smartAccountAddress?: Address;
    entryPoint: entryPoint;
    factoryAddress?: Address;
    owners?: Address[];
    salt?: bigint;
}>;
/**
 * Build a modular smart account from a cometh signer
 * @param comethSigner
 * @param apiKey
 * @param rpcUrl
 * @param smartAccountAddress
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param validatorAddress
 */
export async function signerToModularSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    comethSigner,
    apiKey,
    rpcUrl,
    smartAccountAddress,
    entryPoint: entryPointAddress,
    factoryAddress,
    owners = [],
    salt = 0n,
}: signerToModularSmartAccountParameters<entryPoint>): Promise<
    ModularSmartAccount<entryPoint, TTransport, TChain>
> {
    const api = new API(apiKey);
    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    factoryAddress = getDefaultMultiP256OwnerModularAccountFactoryAddress();
    if (!factoryAddress) throw new Error("factoryAddress not found");

    let ownerAddress: Address;

    if (comethSigner.type === "localWallet") {
        ownerAddress = comethSigner.eoaFallback.signer.address;
    } else {
        //TO DO: CHANGE SIGNER AND FACTORY TO GET FROM BACKEND
        ownerAddress = await predictSignerAddress(comethSigner);
    }

    // Helper to generate the init code for the smart account
    const generateInitCode = () =>
        getAccountInitCode({
            signerAddress: ownerAddress,
            factoryAddress: factoryAddress as Address,
            owners,
            salt,
        });

    let verifiedSmartAccountAddress: `0x${string}`;

    if (smartAccountAddress) {
        verifiedSmartAccountAddress = smartAccountAddress;
        await connectToExistingWallet({
            api,
            smartAccountAddress: verifiedSmartAccountAddress,
        });
    } else {
        verifiedSmartAccountAddress = await getAccountAddress({
            client,
            entryPointAddress,
            initCodeProvider: generateInitCode,
        });

        await createNewWalletInDb({
            api,
            smartAccountAddress: verifiedSmartAccountAddress,
            signer: comethSigner,
        });
    }

    if (!verifiedSmartAccountAddress)
        throw new Error("Account address not found");

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        verifiedSmartAccountAddress
    );

    let multiOwnerSigner: MultiOwnerSigner;

    if (comethSigner.type === "localWallet") {
        multiOwnerSigner = ECDSAMessageSigner(
            client,
            verifiedSmartAccountAddress,
            () => comethSigner.eoaFallback.signer
        );
    } else {
        multiOwnerSigner = WebauthnMessageSigner(comethSigner.passkey);
    }

    return toSmartAccount({
        address: verifiedSmartAccountAddress,
        async signMessage({ message }) {
            return multiOwnerSigner.signMessage({ message });
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async signTypedData() {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        client: client,
        publicKey: smartAccountAddress,
        entryPoint: entryPointAddress,
        source: "modularSmartAccount",

        // Get the nonce of the smart account
        async getNonce() {
            return getAccountNonce(client, {
                sender: verifiedSmartAccountAddress,
                entryPoint: entryPointAddress,
            });
        },

        // Sign a user operation
        async signUserOperation(userOperation) {
            const publicClient = createPublicClient({
                chain: client.chain,
                transport: http(),
            });

            const { maxFeePerGas, /* maxPriorityFeePerGas */ } =
                (await publicClient.estimateFeesPerGas()) as {
                    maxFeePerGas: bigint;
                    maxPriorityFeePerGas: bigint;
                };

            userOperation.maxFeePerGas = maxFeePerGas * 2n;
            userOperation.maxPriorityFeePerGas = maxFeePerGas;
            // hardcode verificationGasLimit as bundler struggles with p256 verifcation estimate
            userOperation.verificationGasLimit = 1000000n;

            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x",
                },
                entryPoint: entryPointAddress as EntryPoint,
                chainId: (client.chain as Chain).id,
            });

            return multiOwnerSigner.signUserOperationHash(hash);
        },

        // Encode the init code
        async getInitCode() {
            if (smartAccountDeployed) return "0x";

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                verifiedSmartAccountAddress
            );

            if (smartAccountDeployed) return "0x";

            return await generateInitCode();
        },

        async getFactory() {
            if (smartAccountDeployed) return undefined;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                verifiedSmartAccountAddress
            );

            if (smartAccountDeployed) return undefined;

            return factoryAddress;
        },

        async getFactoryData() {
            if (smartAccountDeployed) return undefined;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                verifiedSmartAccountAddress
            );

            if (smartAccountDeployed) return undefined;

            return await generateInitCode();
        },

        // Encode the deploy call data
        async encodeDeployCallData(_) {
            throw new Error(
                "Modular account doesn't support account deployment"
            );
        },

        // Encode a call
        async encodeCallData(_tx) {
            if (!smartAccountDeployed && comethSigner.type === "passkey") {
                return encodeP256DeploymentCall(_tx, comethSigner.passkey);
            }

            if (Array.isArray(_tx)) {
                // Encode a batched call
                return encodeFunctionData({
                    abi: IStandardExecutorAbi,
                    functionName: "executeBatch",
                    args: [
                        _tx.map((tx) => ({
                            target: tx.to,
                            data: tx.data,
                            value: tx.value ?? 0n,
                        })),
                    ],
                });
            }

            // Encode a simple call
            return encodeFunctionData({
                abi: IStandardExecutorAbi,
                functionName: "execute",
                args: [_tx.to, _tx.value, _tx.data],
            });
        },

        // Get simple dummy signature
        async getDummySignature(_userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ..._userOperation,
                    signature: "0x",
                },
                entryPoint: entryPointAddress as EntryPoint,
                chainId: (client.chain as Chain).id,
            });

            return multiOwnerSigner.getDummySignature(hash);
        },
    });
}
