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
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concatHex,
    encodeFunctionData,
    hexToBigInt,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "../../services/API";
import { getClient } from "../utils";

import { createSigner } from "@/core/signers/createSigner";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import type { ComethSigner, SignerConfig } from "@/core/signers/types";
import { WalletImplementation } from "@/core/types";
import type { EntryPoint } from "permissionless/_types/types";
import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "../../services/comethService";
import { IP256PluginDeployerAbi } from "./abis/IP256PluginDeployer";
import { IStandardExecutorAbi } from "./abis/IStandardExecutor";
import { multiP256OwnerModularAccountFactoryAbi } from "./abis/MultiP256OwnerModularAccountFactory";
import { ECDSAMessageSigner } from "./plugins/multi-owner/ecdsa/ECDSAsigner";
import { WebauthnMessageSigner } from "./plugins/multi-owner/webauthn/webauthnSigner";
import type { MultiOwnerSigner } from "./plugins/types";

export type ModularSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "modularSmartAccount", transport, chain>;

/**
 * Encode the p256 deployment and call for a modular smart account
 * @param _tx
 * @param passkey
 * @param p256FactoryAddress
 */
const encodeP256DeploymentCall = ({
    _tx,
    passkey,
    p256FactoryAddress,
}: {
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
          }[];
    passkey: PasskeyLocalStorageFormat;
    p256FactoryAddress: Address;
}) => {
    const { x, y } = passkey.pubkeyCoordinates;

    const Calls = Array.isArray(_tx)
        ? _tx.map((tx) => ({
              target: tx.to,
              data: tx.data,
              value: tx.value ?? 0n,
          }))
        : {
              target: _tx.to,
              data: _tx.data,
              value: _tx.value ?? 0n,
          };

    return encodeFunctionData({
        abi: IP256PluginDeployerAbi,
        functionName: "executeAndDeployPasskey",
        args: [x, y, p256FactoryAddress, Calls],
    });
};

/**
 * Get the multi owner signer for a modular smart account
 * @param client
 * @param smartAccountAddress
 * @param signer
 */
const getMultiOwnerSigner = <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    client,
    smartAccountAddress,
    signer,
}: {
    client: Client<TTransport, TChain, undefined>;
    smartAccountAddress: Address;
    signer: ComethSigner;
}): MultiOwnerSigner => {
    if (signer.type === "localWallet") {
        return ECDSAMessageSigner(
            client,
            smartAccountAddress,
            () => signer.eoaFallback.signer
        );
    }
    return WebauthnMessageSigner(signer.passkey);
};

/**
 * Authenticate the wallet to the cometh api
 * @param client
 * @param entryPointAddress
 * @param initCodeProvider
 * @param smartAccountAddress
 * @param signer
 * @param api
 */
const authenticateToComethApi = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    client,
    entryPointAddress,
    initCodeProvider,
    smartAccountAddress,
    signer,
    api,
}: {
    client: Client<TTransport, TChain, undefined>;
    entryPointAddress: Address;
    initCodeProvider: () => Promise<Hex>;
    smartAccountAddress?: Address;
    signer: ComethSigner;
    api: API;
}): Promise<Address> => {
    if (smartAccountAddress) {
        await connectToExistingWallet({
            api,
            smartAccountAddress,
        });
    } else {
        smartAccountAddress = await getAccountAddress({
            client,
            entryPointAddress,
            initCodeProvider,
        });

        await createNewWalletInDb({
            api,
            smartAccountAddress,
            signer,
            walletImplementation: WalletImplementation.Modular_Account,
        });
    }
    return smartAccountAddress;
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
    // owners need to be dedupe + ordered in ascending order and not == to zero address
    const owners_ = Array.from(new Set([...owners, signerAddress]))
        .filter((x) => hexToBigInt(x) !== 0n)
        .sort((a, b) => {
            const bigintA = hexToBigInt(a);
            const bigintB = hexToBigInt(b);

            return bigintA < bigintB ? -1 : bigintA > bigintB ? 1 : 0;
        });

    return concatHex([
        factoryAddress,
        encodeFunctionData({
            abi: multiP256OwnerModularAccountFactoryAbi,
            functionName: "createAccount",
            args: [salt, owners_],
        }),
    ]);
};

/**
 * Predict Account address from the entrypoint
 * @param client
 * @param entryPointAddress
 * @param initCodeProvider
 */
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
    return getSenderAddress<ENTRYPOINT_ADDRESS_V06_TYPE>(client, {
        initCode: await initCodeProvider(),
        entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V06_TYPE,
    });
};

export type createModularSmartAccountParameters<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
> = Prettify<{
    apiKey: string;
    comethSigner?: ComethSigner;
    rpcUrl?: string;
    baseUrl?: string;
    smartAccountAddress?: Address;
    entryPoint: entryPoint;
    factoryAddress?: Address;
    owners?: Address[];
    salt?: bigint;
    comethSignerConfig?: SignerConfig;
}>;
/**
 * Build a modular smart account from a cometh signer
 * @param comethSigner
 * @param apiKey
 * @param rpcUrl
 * @param smartAccountAddress
 * @param entryPoint
 * @param factoryAddress
 * @param owners
 * @param salt
 */
export async function createModularSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    apiKey,
    comethSigner,
    rpcUrl,
    baseUrl,
    smartAccountAddress,
    entryPoint: entryPointAddress,
    factoryAddress,
    owners = [],
    salt = 0n,
    comethSignerConfig,
}: createModularSmartAccountParameters<entryPoint>): Promise<
    ModularSmartAccount<entryPoint, TTransport, TChain>
> {
    const api = new API(apiKey, baseUrl);
    const contractParams = await api.getContractParams(
        WalletImplementation.Modular_Account
    );

    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    if (!comethSigner) {
        comethSigner = await createSigner({
            apiKey,
            baseUrl,
            smartAccountAddress,
            ...comethSignerConfig,
        });
    }

    factoryAddress = contractParams.walletFactoryAddress;

    if (!factoryAddress) throw new Error("factoryAddress not found");

    let ownerAddress: Address;

    if (comethSigner.type === "localWallet") {
        ownerAddress = comethSigner.eoaFallback.signer.address;
    } else {
        ownerAddress = comethSigner.passkey.signerAddress;
    }

    // Helper to generate the init code for the smart account
    const generateInitCode = () =>
        getAccountInitCode({
            signerAddress: ownerAddress,
            factoryAddress: factoryAddress as Address,
            owners,
            salt,
        });

    smartAccountAddress = await authenticateToComethApi({
        client,
        entryPointAddress,
        initCodeProvider: generateInitCode,
        smartAccountAddress,
        signer: comethSigner,
        api,
    });

    if (!smartAccountAddress) throw new Error("Account address not found");

    let smartAccountDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    const multiOwnerSigner = getMultiOwnerSigner({
        client,
        smartAccountAddress,
        signer: comethSigner,
    });

    return toSmartAccount({
        address: smartAccountAddress,
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
        entryPoint: entryPointAddress,
        source: "modularSmartAccount",

        // Get the nonce of the smart account
        async getNonce() {
            return getAccountNonce(client, {
                sender: smartAccountAddress,
                entryPoint: entryPointAddress,
            });
        },

        // Sign a user operation
        async signUserOperation(userOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x",
                },
                entryPoint: entryPointAddress as EntryPoint,
                chainId: (client.chain as Chain).id,
            });

            return await multiOwnerSigner.signUserOperationHash(hash);
        },

        // Encode the init code
        async getInitCode() {
            if (smartAccountDeployed) return "0x";

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (smartAccountDeployed) return "0x";

            return await generateInitCode();
        },

        async getFactory() {
            if (smartAccountDeployed) return undefined;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (smartAccountDeployed) return undefined;

            return factoryAddress;
        },

        async getFactoryData() {
            if (smartAccountDeployed) return undefined;

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
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
            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                smartAccountAddress
            );

            if (!smartAccountDeployed && comethSigner.type === "passkey") {
                return encodeP256DeploymentCall({
                    _tx,
                    passkey: comethSigner.passkey,
                    p256FactoryAddress:
                        contractParams.P256FactoryContractAddress,
                });
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
                args: [_tx.to, _tx.value ?? 0n, _tx.data],
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
