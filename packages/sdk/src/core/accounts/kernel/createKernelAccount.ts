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
import type { TypedData } from "viem";
import {
  type Address,
  type Chain,
  type Client,
  type Hex,
  type LocalAccount,
  type Transport,
  type TypedDataDefinition,
  concatHex,
  encodeFunctionData,
  isAddressEqual,
} from "viem";
import {
  getChainId,
  readContract,
  signMessage,
  signTypedData,
} from "viem/actions";
import { KernelExecuteAbi, KernelInitAbi } from "./abi/KernelAccountAbi";
import type { Prettify } from "viem/types/utils";
import type { ENTRYPOINT_ADDRESS_V06_TYPE } from "permissionless/types/entrypoint";
import { KERNEL_ADDRESSES, networks } from "../../../config";
import type { PasskeyCredentials } from "../../signers/passkeys/types";
import { API } from "../../services/API";
import { getNetwork, getViemClient } from "../utils";
import { encryptSignerInStorage } from "../../signers/fallbackEoa/services/eoaFallbackService";
import type { ComethSigner } from "../../signers/createSigner";

export type KernelEcdsaSmartAccount<
  entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined
> = SmartAccount<entryPoint, "kernelEcdsaSmartAccount", transport, chain>;

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
 * @param owner
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param validatorAddress
 */
export const getAccountInitCode = async ({
  owner,
  index,
  accountLogicAddress,
  validatorAddress,
  passkey,
}: {
  owner: Address;
  index: bigint;
  accountLogicAddress: Address;
  validatorAddress: Address;
  passkey?: PasskeyCredentials;
}): Promise<Hex> => {
  if (!owner) throw new Error("Owner account not found");

  let initialisationData: Hex;

  // Build the account initialization data
  if (passkey) {
    const encodedPublicKey = concatHex([
      passkey.publicKeyX,
      passkey.publicKeyY,
    ]);

    initialisationData = encodeFunctionData({
      abi: KernelInitAbi,
      functionName: "initialize",
      args: [validatorAddress, encodedPublicKey],
    });
  } else {
    initialisationData = encodeFunctionData({
      abi: KernelInitAbi,
      functionName: "initialize",
      args: [validatorAddress, owner],
    });
  }

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
 * @param owner
 * @param entryPoint
 * @param validatorAddress
 * @param initCodeProvider
 * @param deployedAccountAddress
 */
export const getAccountAddress = async <
  entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>({
  client,
  owner,
  entryPoint: entryPointAddress,
  initCodeProvider,
  validatorAddress,
  deployedAccountAddress,
  factoryAddress,
}: {
  client: Client<TTransport, TChain>;
  owner: Address;
  initCodeProvider: () => Promise<Hex>;
  factoryAddress: Address;
  entryPoint: entryPoint;
  validatorAddress: Address;
  deployedAccountAddress?: Address;
}): Promise<Address> => {
  // If we got an already deployed account, ensure it's well deployed, and the validator & signer are correct
  if (deployedAccountAddress !== undefined) {
    // Get the owner of the deployed account, ensure it's the same as the owner given in params
    const deployedAccountOwner = await readContract(client, {
      address: validatorAddress,
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "ecdsaValidatorStorage",
          outputs: [
            {
              internalType: "address",
              name: "owner",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "ecdsaValidatorStorage",
      args: [deployedAccountAddress],
    });

    // Ensure the address match
    if (!isAddressEqual(deployedAccountOwner, owner)) {
      throw new Error("Invalid owner for the already deployed account");
    }

    // If ok, return the address
    return deployedAccountAddress;
  }

  // Find the init code for this account
  const factoryData = await initCodeProvider();

  return getSenderAddress<ENTRYPOINT_ADDRESS_V06_TYPE>(client, {
    initCode: concatHex([factoryAddress, factoryData]),
    entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V06_TYPE,
  });
};

export type signerToKernelSmartAccountParameters<
  entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE
> = Prettify<{
  comethSigner: ComethSigner;
  apiKey: string;
  rpcUrl?: string;
  address?: Address;
  entryPoint: entryPoint;
  index?: bigint;
  factoryAddress?: Address;
  accountLogicAddress?: Address;
  validatorAddress?: Address;
  deployedAccountAddress?: Address;
}>;
/**
 * Build a kernel smart account from a private key, that use the ECDSA signer behind the scene
 * @param client
 * @param privateKey
 * @param entryPoint
 * @param index
 * @param factoryAddress
 * @param accountLogicAddress
 * @param validatorAddress
 * @param deployedAccountAddress
 */
export async function signerToKernelSmartAccount<
  entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>({
  comethSigner,
  apiKey,
  rpcUrl,
  address,
  entryPoint: entryPointAddress,
  index = 0n,
  factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
  accountLogicAddress = KERNEL_ADDRESSES.ACCOUNT_LOGIC,
  validatorAddress = KERNEL_ADDRESSES.ECDSA_VALIDATOR,
  deployedAccountAddress,
}: signerToKernelSmartAccountParameters<entryPoint>): Promise<
  KernelEcdsaSmartAccount<entryPoint, TTransport, TChain>
> {
  console.log({ comethSigner });
  const entryPointVersion = getEntryPointVersion(entryPointAddress);

  if (entryPointVersion !== "v0.6") {
    throw new Error("Only EntryPoint 0.6 is supported");
  }

  const api = new API(apiKey);
  const chain = await getNetwork(api);
  const client = getViemClient(
    chain,
    rpcUrl || networks[chain.id].rpcUrl
  ) as Client<TTransport, TChain, undefined>;

  // Get the private key related account
  const viemSigner: LocalAccount = {
    ...comethSigner.signer,
    signTransaction: (_, __) => {
      throw new SignTransactionNotSupportedBySmartAccount();
    },
  } as LocalAccount;

  // Helper to generate the init code for the smart account
  const generateInitCode = () =>
    getAccountInitCode({
      owner: viemSigner.address,
      index,
      accountLogicAddress,
      validatorAddress,
    });

  // Fetch account address and chain id
  const [smartAccountAddress, chainId] = await Promise.all([
    address ??
      getAccountAddress<entryPoint, TTransport, TChain>({
        client,
        entryPoint: entryPointAddress,
        owner: viemSigner.address,
        validatorAddress,
        initCodeProvider: generateInitCode,
        deployedAccountAddress,
        factoryAddress,
      }),
    getChainId(client),
  ]);

  if (!smartAccountAddress) throw new Error("Account address not found");

  // TODO adapt backend route to save a wallet in db
  /*  if (address) {
    const storedWallet = api.getWalletInfos(address);
    if (!storedWallet) throw new Error("Wallet not found");
  } else {
    api.initWallet({ ownerAddress: comethSigner.signer.address });
  } */

  if (comethSigner.eoaFallbackParams) {
    await encryptSignerInStorage(
      smartAccountAddress,
      comethSigner.eoaFallbackParams.privateKey,
      comethSigner.eoaFallbackParams.encryptionSalt
    );
  }

  let smartAccountDeployed = await isSmartAccountDeployed(
    client,
    smartAccountAddress
  );

  return toSmartAccount({
    address: smartAccountAddress,
    async signMessage({ message }) {
      return signMessage(client, { account: viemSigner, message });
    },
    async signTransaction(_, __) {
      throw new SignTransactionNotSupportedBySmartAccount();
    },
    async signTypedData<
      const TTypedData extends TypedData | Record<string, unknown>,
      TPrimaryType extends keyof TTypedData | "EIP712Domain" = keyof TTypedData
    >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
      return signTypedData<TTypedData, TPrimaryType, TChain, undefined>(
        client,
        {
          account: viemSigner,
          ...typedData,
        }
      );
    },
    client: client,
    publicKey: smartAccountAddress,
    entryPoint: entryPointAddress,
    source: "kernelEcdsaSmartAccount",

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
        entryPoint: entryPointAddress,
        chainId: chainId,
      });
      const signature = await signMessage(client, {
        account: viemSigner,
        message: { raw: hash },
      });
      // Always use the sudo mode, since we will use external paymaster
      return concatHex(["0x00000000", signature]);
    },

    // Encode the init code
    async getInitCode() {
      if (smartAccountDeployed) return "0x";

      smartAccountDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
      );

      if (smartAccountDeployed) return "0x";

      return concatHex([factoryAddress, await generateInitCode()]);
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

      return generateInitCode();
    },

    // Encode the deploy call data
    async encodeDeployCallData(_) {
      throw new Error("Simple account doesn't support account deployment");
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
      return "0x00000000fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    },
  });
}
