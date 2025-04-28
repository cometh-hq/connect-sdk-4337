import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    encodePacked,
    hashTypedData,
} from "viem";
import { toAccount } from "viem/accounts";

import {
    DUMMY_AUTHENTICATOR_DATA,
    DUMMY_CLIENT_DATA_FIELDS,
    buildSignatureBytes,
    getSignatureBytes,
    packInitCode,
    packPaymasterData,
} from "@/accounts/safe/services/utils";
import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import { MethodNotSupportedError } from "@/errors";
import { sign } from "@/signers/passkeys/passkeyService";
import type { PasskeyLocalStorageFormat } from "@/signers/passkeys/types";
import { parseHex } from "@/signers/passkeys/utils";
import {
    EIP712_SAFE_MESSAGE_TYPE,
    EIP712_SAFE_OPERATION_TYPE,
} from "../../types";
import type { SafeSigner } from "../types";
import { generateSafeMessageMessage } from "../utils";

/**
 * Creates a SafeSigner using WebAuthn for authentication
 *
 * @param client - The viem Client instance
 * @param params - Object containing:
 *   @param passkey - The passkey in local storage format
 *   @param passkeySignerAddress - The address of the passkey signer
 *   @param smartAccountAddress - The address of the smart account
 *   @param fullDomainSelected - Boolean indicating if the full domain is selected
 *   @param userOpVerifyingContract - The address of the user operation verifying contract
 *   @param safeWebAuthnSharedSignerContractAddress - The address of the Safe WebAuthn shared signer contract
 *
 * @returns A Promise that resolves to a SafeSigner instance with WebAuthn capabilities
 */
export async function safeWebAuthnSigner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        passkey,
        passkeySignerAddress,
        smartAccountAddress,
        fullDomainSelected,
        userOpVerifyingContract,
        safeWebAuthnSharedSignerContractAddress,
    }: {
        passkey: PasskeyLocalStorageFormat;
        passkeySignerAddress: Address;
        smartAccountAddress: Address;
        fullDomainSelected: boolean;
        userOpVerifyingContract: Address;
        safeWebAuthnSharedSignerContractAddress: Address;
    }
): Promise<SafeSigner<"safeWebAuthnSigner">> {
    const publicKeyCredential: PublicKeyCredentialDescriptor = {
        id: parseHex(passkey.id),
        type: "public-key",
    };

    const account = toAccount({
        //address: smartAccountAddress,
        address: safeWebAuthnSharedSignerContractAddress,
        async signMessage({ message }) {
            const hash = hashTypedData({
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: smartAccountAddress,
                },
                types: EIP712_SAFE_MESSAGE_TYPE,
                primaryType: "SafeMessage" as const,
                message: { message: generateSafeMessageMessage(message) },
            });

            const passkeySignature = await sign({
                challenge: hash,
                publicKeyCredential: [publicKeyCredential],
                fullDomainSelected,
            });

            return buildSignatureBytes([
                {
                    signer: passkeySignerAddress,
                    data: passkeySignature.signature,
                    dynamic: true,
                },
            ]) as Hex;
        },
        async signTransaction(_, __) {
            throw new MethodNotSupportedError();
        },
        async signTypedData() {
            throw new MethodNotSupportedError();
        },
    });

    return {
        ...account,
        address: safeWebAuthnSharedSignerContractAddress,
        smartAccountAddress,
        source: "safeWebAuthnSigner",
        // Sign a user operation
        async signUserOperation(parameters) {
            const { ...userOperation } = parameters;

            const hash = hashTypedData({
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: userOpVerifyingContract,
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
                        paymaster: userOperation.paymaster as Address,
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
            });

            const passkeySignature = await sign({
                challenge: hash,
                publicKeyCredential: [publicKeyCredential],
                fullDomainSelected,
            });

            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [
                    0,
                    0,
                    buildSignatureBytes([
                        {
                            signer: passkeySignerAddress,
                            data: passkeySignature.signature,
                            dynamic: true,
                        },
                    ]) as Hex,
                ]
            );
        },

        /**
         * Get a dummy signature for this smart account
         */
        async getStubSignature() {
            return encodePacked(
                ["uint48", "uint48", "bytes"],
                [
                    0,
                    0,
                    buildSignatureBytes([
                        {
                            signer: passkeySignerAddress,
                            data: getSignatureBytes({
                                authenticatorData: DUMMY_AUTHENTICATOR_DATA,
                                clientDataFields: DUMMY_CLIENT_DATA_FIELDS,
                                r: BigInt(`0x${"ec".repeat(32)}`),
                                s: BigInt(`0x${"d5a".repeat(21)}f`),
                            }),
                            dynamic: true,
                        },
                    ]) as Hex,
                ]
            );
        },
    };
}
