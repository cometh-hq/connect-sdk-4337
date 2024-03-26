import {
    getAccountNonce,
    getEntryPointVersion,
    getSenderAddress,
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
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "../../services/API";
import { getClient } from "../utils";
import { KernelExecuteAbi, KernelInitAbi } from "./abi/KernelAccountAbi";

import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "../../services/comethService";
import type { ComethSigner } from "../../signers/types";
import { KERNEL_ADDRESSES } from "./constants";
import { signerToKernelValidator } from "./validators/signerToValidator";

export type KernelSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "kernelSmartAccount", transport, chain>;

/**
 * The account creation ABI for a kernel smart account (from the KernelFactory)
 */
const createAccountAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_implementation",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
            },
            {
                internalType: "uint256",
                name: "_index",
                type: "uint256",
            },
        ],
        name: "createAccount",
        outputs: [
            {
                internalType: "address",
                name: "proxy",
                type: "address",
            },
        ],
        stateMutability: "payable",
        type: "function",
    },
] as const;

/**
 * Get the account initialization code for a kernel smart account
 * @param index
 * @param accountLogicAddress
 * @param validatorAddress
 * @param enableData
 */
export const getAccountInitCode = async ({
    index,
    accountLogicAddress,
    validatorAddress,
    enableData,
}: {
    index: bigint;
    accountLogicAddress: Address;
    validatorAddress: Address;
    enableData: Hex;
}): Promise<Hex> => {
    // Build the account initialization data

    const initialisationData = encodeFunctionData({
        abi: KernelInitAbi,
        functionName: "initialize",
        args: [validatorAddress, enableData],
    });

    // Build the account init code
    return encodeFunctionData({
        abi: createAccountAbi,
        functionName: "createAccount",
        args: [accountLogicAddress, initialisationData, index],
    });
};

/**
 * Check the validity of an existing account address, or fetch the pre-deterministic account address for a kernel smart wallet
 * @param client
 * @param entryPoint
 * @param initCodeProvider
 * @param factoryAddress
 */
export const getAccountAddress = async <
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    client,
    entryPoint: entryPointAddress,
    initCodeProvider,
    factoryAddress,
}: {
    client: Client<TTransport, TChain>;
    initCodeProvider: () => Promise<Hex>;
    factoryAddress: Address;
    entryPoint: entryPoint;
}): Promise<Address> => {
    // Find the init code for this account
    const initCode = await initCodeProvider();

    return getSenderAddress<ENTRYPOINT_ADDRESS_V06_TYPE>(client, {
        initCode: concatHex([factoryAddress, initCode]),
        entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V06_TYPE,
    });
};

export type signerToKernelSmartAccountParameters<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
> = Prettify<{
    comethSigner: ComethSigner;
    apiKey: string;
    rpcUrl?: string;
    smartAccountAddress?: Address;
    entryPoint: entryPoint;
    index?: bigint;
    factoryAddress?: Address;
    accountLogicAddress?: Address;
    validatorAddress?: Address;
}>;
/**
 * Build a kernel smart account from a cometh signer
 * @param comethSigner
 * @param apiKey
 * @param rpcUrl
 * @param smartAccountAddress
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param validatorAddress
 */
export async function signerToKernelSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>({
    comethSigner,
    apiKey,
    rpcUrl,
    smartAccountAddress,
    entryPoint: entryPointAddress,
    index = 0n,
    factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
    accountLogicAddress = KERNEL_ADDRESSES.ACCOUNT_LOGIC,
    validatorAddress = KERNEL_ADDRESSES.ECDSA_VALIDATOR,
}: signerToKernelSmartAccountParameters<entryPoint>): Promise<
    KernelSmartAccount<entryPoint, TTransport, TChain>
> {
    const entryPointVersion = getEntryPointVersion(entryPointAddress);

    if (entryPointVersion !== "v0.6") {
        throw new Error("Only EntryPoint 0.6 is supported");
    }

    const api = new API(apiKey);
    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    const validator = await signerToKernelValidator(client, {
        comethSigner,
    });

    const enableData = await validator.getEnableData();

    // Helper to generate the init code for the smart account
    const generateInitCode = () =>
        getAccountInitCode({
            index,
            accountLogicAddress,
            validatorAddress,
            enableData,
        });

    let verifiedSmartAccountAddress: `0x${string}`;

    if (smartAccountAddress) {
        verifiedSmartAccountAddress = smartAccountAddress;
        await connectToExistingWallet({
            api,
            smartAccountAddress: verifiedSmartAccountAddress,
        });
    } else {
        verifiedSmartAccountAddress = await getAccountAddress<
            entryPoint,
            TTransport,
            TChain
        >({
            client,
            entryPoint: entryPointAddress,
            initCodeProvider: generateInitCode,
            factoryAddress,
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

    return toSmartAccount({
        address: verifiedSmartAccountAddress,
        async signMessage({ message }) {
            return validator.signMessage({ message });
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
        source: "kernelSmartAccount",

        // Get the nonce of the smart account
        async getNonce() {
            return getAccountNonce(client, {
                sender: verifiedSmartAccountAddress,
                entryPoint: entryPointAddress,
            });
        },

        // Sign a user operation
        async signUserOperation(userOperation) {
            return validator.signUserOperation(userOperation);
        },

        // Encode the init code
        async getInitCode() {
            if (smartAccountDeployed) return "0x";

            smartAccountDeployed = await isSmartAccountDeployed(
                client,
                verifiedSmartAccountAddress
            );

            if (smartAccountDeployed) return "0x";

            return concatHex([factoryAddress, await generateInitCode()]);
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

            return generateInitCode();
        },

        // Encode the deploy call data
        async encodeDeployCallData(_) {
            throw new Error(
                "Simple account doesn't support account deployment"
            );
        },

        // Encode a call
        async encodeCallData(_tx) {
            if (Array.isArray(_tx)) {
                // Encode a batched call
                return encodeFunctionData({
                    abi: KernelExecuteAbi,
                    functionName: "executeBatch",
                    args: [
                        _tx.map((tx) => ({
                            to: tx.to,
                            value: tx.value,
                            data: tx.data,
                        })),
                    ],
                });
            }
            // Encode a simple call
            return encodeFunctionData({
                abi: KernelExecuteAbi,
                functionName: "execute",
                args: [_tx.to, _tx.value, _tx.data, 0],
            });
        },

        // Get simple dummy signature
        async getDummySignature(_userOperation) {
            return validator.getDummySignature(_userOperation);
        },
    });
}
