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
} from "viem";
import { toAccount } from "viem/accounts";
import { signMessage, signTypedData } from "viem/actions";

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import { isUserOpWhitelisted } from "../../../../actions/accounts/safe/sessionKeys/utils";
import {
    ECDSA_DUMMY_SIGNATURE,
    buildSignatureBytes,
    packInitCode,
    packPaymasterData,
} from "../../services/utils";
import { EIP712_SAFE_OPERATION_TYPE } from "../../types";
import type { SafeSigner } from "../types";

export async function safeSessionKeySigner<
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
        multisend,
    }: {
        signer: SmartAccountSigner<TSource, TAddress>;
        safe4337SessionKeysModule: Address;
        smartAccountAddress: Address;
        multisend: Address;
    }
): Promise<SafeSigner<"safeSessionKeySigner">> {
    // Get the private key related account
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
    } as LocalAccount;

    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return signMessage(client, { account: viemSigner, message });
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
        address: signer.address,
        source: "safeSessionKeySigner",
        // Sign a user operation
        async signUserOperation(userOperation) {
            const isWhitelisted = await isUserOpWhitelisted({
                chain: client?.chain as Chain,
                safe4337SessionKeysModule,
                sessionKey: signer.address,
                userOperation,
                multisend,
                smartAccountAddress,
            });

            if (!isWhitelisted)
                throw new Error("Transactions are not whitelisted");

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
                    paymasterAndData: packPaymasterData({
                        paymaster: userOperation.paymaster as Hex,
                        paymasterVerificationGasLimit:
                            userOperation.paymasterVerificationGasLimit as bigint,
                        paymasterPostOpGasLimit:
                            userOperation.paymasterPostOpGasLimit as bigint,
                        paymasterData: userOperation.paymasterData as Hex,
                    }),
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
