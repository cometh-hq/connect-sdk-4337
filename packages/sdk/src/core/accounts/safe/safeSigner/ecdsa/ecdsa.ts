import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner,
} from "permissionless/accounts";
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    encodePacked,
    toHex,
} from "viem";
import { toAccount } from "viem/accounts";
import { signTypedData } from "viem/actions";

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import {
    ECDSA_DUMMY_SIGNATURE,
    buildSignatureBytes,
    packInitCode,
} from "../../services/utils";
import {
    EIP712_SAFE_MESSAGE_TYPE,
    EIP712_SAFE_OPERATION_TYPE,
} from "../../types";
import type { SafeSigner } from "../types";

/**
 * Creates a SafeSigner using ECDSA for signing
 *
 * @param client - The viem Client instance
 * @param params - Object containing:
 *   @param signer - The SmartAccountSigner instance
 *   @param safe4337SessionKeysModule - The address of the Safe 4337 session keys module
 *   @param smartAccountAddress - The address of the smart account
 *
 * @returns A Promise that resolves to a SafeSigner instance with ECDSA capabilities
 */
export async function safeECDSASigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        safe4337SessionKeysModule,
        smartAccountAddress,
    }: {
        signer: SmartAccountSigner<TSource, TAddress>;
        safe4337SessionKeysModule: Address;
        smartAccountAddress: Address;
    }
): Promise<SafeSigner<"safeECDSASigner">> {
    // Get the private key related account
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
    } as LocalAccount;

    const account = toAccount({
        address: smartAccountAddress,
        async signMessage({ message }) {
            if (typeof message === "string") message = toHex(message);

            return signTypedData(client, {
                account: viemSigner,
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: smartAccountAddress,
                },
                types: EIP712_SAFE_MESSAGE_TYPE,
                primaryType: "SafeMessage" as const,
                message: { message },
            });
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData,
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return signTypedData<TTypedData, TPrimaryType, TChain, undefined>(
                client,
                {
                    account: viemSigner,
                    ...typedData,
                }
            );
        },
    });

    return {
        ...account,
        address: smartAccountAddress,
        source: "safeECDSASigner",
        // Sign a user operation
        async signUserOperation(userOperation) {
            const payload = {
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: safe4337SessionKeysModule,
                },
                types: EIP712_SAFE_OPERATION_TYPE,
                primaryType: "SafeOp" as const,
                message: {
                    callData: userOperation.callData,
                    nonce: userOperation.nonce,
                    initCode: packInitCode({
                        factory: userOperation.factory,
                        factoryData: userOperation.factoryData,
                    }),
                    paymasterAndData: encodePacked(
                        ["address", "uint128", "uint128", "bytes"],
                        [
                            userOperation.paymaster as Address,
                            userOperation.paymasterVerificationGasLimit as bigint,
                            userOperation.paymasterPostOpGasLimit as bigint,
                            userOperation.paymasterData as Hex,
                        ]
                    ) as Hex,
                    preVerificationGas: userOperation.preVerificationGas,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    validAfter: 0,
                    validUntil: 0,
                    safe: userOperation.sender,
                    verificationGasLimit: userOperation.verificationGasLimit,
                    callGasLimit: userOperation.callGasLimit,
                    maxPriorityFeePerGas: userOperation.maxPriorityFeePerGas,
                    maxFeePerGas: userOperation.maxFeePerGas,
                },
            };

            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [
                    0,
                    0,
                    buildSignatureBytes([
                        {
                            signer: signer.address,
                            data: await signer.signTypedData(payload),
                        },
                    ]) as Hex,
                ]
            );
        },

        /**
         * Get a dummy signature for this smart account
         */
        async getDummySignature() {
            return ECDSA_DUMMY_SIGNATURE;
        },
    };
}
