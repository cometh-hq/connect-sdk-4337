import {
    getAccountNonce,
    getEntryPointVersion,
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
    keccak256,
    encodePacked,
    getContractAddress,
} from "viem";
import type { Prettify } from "viem/types/utils";

import { API } from "../../services/API";
import { getClient } from "../utils";

import type { ComethSigner } from "@/core/signers/types";
import type { EntryPoint } from "permissionless/_types/types";
import {
    connectToExistingWallet,
    createNewWalletInDb,
} from "../../services/comethService";
import { IStandardExecutorAbi } from "./abis/IStandardExecutor";
import { MultiP256OwnerModularAccountFactoryAbi } from "./abis/MultiP256OwnerModularAccountFactory";
import { ECDSAMessageSigner } from "./plugins/multi-owner/signer/ECDSAsigner";
import { getDefaultMultiP256OwnerModularAccountFactoryAddress } from "./utils/utils";
import { P256_SIGNER_FACTORY, P256_SIGNER_SINGLETON } from "@/constants";
import { IP256PluginDeployerAbi } from "./abis/IP256PluginDeployer";
import { WebauthnMessageSigner } from "./plugins/multi-owner/webauthn/webauthnSigner";

export type ModularSmartAccount<
    entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
> = SmartAccount<entryPoint, "modularSmartAccount", transport, chain>;

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

        console.log({owners_})

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
    const entryPointVersion = getEntryPointVersion(entryPointAddress);

    if (entryPointVersion !== "v0.6") {
        throw new Error("Only EntryPoint 0.6 is supported");
    }

    const api = new API(apiKey, "https://api.connect.develop.core.cometh.tech");
    const client = (await getClient(api, rpcUrl)) as Client<
        TTransport,
        TChain,
        undefined
    >;

    factoryAddress = getDefaultMultiP256OwnerModularAccountFactoryAddress(
        client.chain as Chain
    );

    console.log({factoryAddress})

    if (!factoryAddress) throw new Error("factoryAddress not found");

    let ownerAddress: Address 

    if (comethSigner.type === "localWallet") {
        ownerAddress = comethSigner.eoaFallback.signer.address;
    } else {
    //TO DO: CHANGE SIGNER AND FACTORY TO GET FROM BACKEND
      const {x, y} = comethSigner.passkey.pubkeyCoordinates;
      const salt = keccak256(
        encodePacked(['uint256', 'uint256'], [hexToBigInt(x), hexToBigInt(y)])
      )
    
      // Init code of minimal proxy from solady 0.0.123
      const initCode = `0x602c3d8160093d39f33d3d3d3d363d3d37363d73${P256_SIGNER_SINGLETON.substring(
        2
      )}5af43d3d93803e602a57fd5bf3` as `0x${string}`
    
      const initCodeHash = keccak256(initCode)
    
      ownerAddress =  getContractAddress({ 
        bytecode: initCodeHash, 
        from: P256_SIGNER_FACTORY, 
        opcode: 'CREATE2', 
        salt: salt, 
      })
    }

    console.log({ownerAddress})

   

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

    

    let multiOwnerSigner: any;

    

    if (comethSigner.type === "localWallet") {

        multiOwnerSigner = ECDSAMessageSigner(
            client,
            verifiedSmartAccountAddress,
            () => comethSigner.eoaFallback.signer
        );
    } else {
    //TO DO: CHANGE SIGNER AND FACTORY TO GET FROM BACKEND
      multiOwnerSigner = WebauthnMessageSigner(client, comethSigner.passkey)
    }

    console.log({multiOwnerSigner})

    return toSmartAccount({
        address: verifiedSmartAccountAddress,
        async signMessage({ message }) {
            console.log({message})
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

            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x",
                },
                entryPoint: entryPointAddress as EntryPoint,
                chainId: (client.chain as Chain).id,
            });

            console.log({hash})

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

            return generateInitCode();
        },

        // Encode the deploy call data
        async encodeDeployCallData(_) {
            throw new Error(
                "Modular account doesn't support account deployment"
            );
        },

        // Encode a call
        async encodeCallData(_tx) {
            
            if(!smartAccountDeployed && comethSigner.type === "passkey") {
                const {x, y} = comethSigner.passkey.pubkeyCoordinates;

               const Calls = Array.isArray(_tx) ? [ _tx.map((tx) => ({
                target: tx.to,
                data: tx.data,
                value: tx.value ?? 0n,
            }))] : [{
                target: _tx.to,
                data: _tx.data,
                value: _tx.value ?? 0n,
            }]

            const result = encodeFunctionData({
                abi: IP256PluginDeployerAbi,
                functionName: "executeAndDeployPasskey",
                args: [x, y, P256_SIGNER_FACTORY , Calls],
            })


                return result
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
            console.log({_userOperation})
            const hash = getUserOperationHash({
                userOperation: {
                    ..._userOperation,
                    signature: "0x",
                },
                entryPoint: entryPointAddress as EntryPoint,
                chainId: (client.chain as Chain).id,
            });

            console.log({hash})
            return multiOwnerSigner.getDummySignature(hash);
        },
    });
}
