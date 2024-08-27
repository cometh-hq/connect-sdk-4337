import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    encodePacked,
    hashTypedData,
    toHex,
} from "viem";
import { toAccount } from "viem/accounts";

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants";
import {
    DUMMY_AUTHENTICATOR_DATA,
    DUMMY_CLIENT_DATA_FIELDS,
    buildSignatureBytes,
    getSignatureBytes,
    packInitCode,
} from "@/core/accounts/safe/services/utils";
import { sign } from "@/core/signers/passkeys/passkeyService";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types";
import { parseHex } from "@/core/signers/passkeys/utils";
import {
    EIP712_SAFE_MESSAGE_TYPE,
    EIP712_SAFE_OPERATION_TYPE,
} from "../../types";
import type { SafeSigner } from "../types";

/**
 * Creates a SafeSigner using WebAuthn for authentication
 *
 * @param client - The viem Client instance
 * @param params - Object containing:
 *   @param passkey - The passkey in local storage format
 *   @param passkeySignerAddress - The address of the passkey signer
 *   @param safe4337SessionKeysModule - The address of the Safe 4337 session keys module
 *   @param smartAccountAddress - The address of the smart account
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
        safe4337SessionKeysModule,
        smartAccountAddress,
    }: {
        passkey: PasskeyLocalStorageFormat;
        passkeySignerAddress: Address;
        safe4337SessionKeysModule: Address;
        smartAccountAddress: Address;
    }
): Promise<SafeSigner<"safeWebAuthnSigner">> {
    const publicKeyCredential: PublicKeyCredentialDescriptor = {
        id: parseHex(passkey.id),
        type: "public-key",
    };

    const account = toAccount({
        address: smartAccountAddress,
        async signMessage({ message }) {
            if (typeof message === "string") message = toHex(message);

            const hash = hashTypedData({
                domain: {
                    chainId: client.chain?.id,
                    verifyingContract: smartAccountAddress,
                },
                types: EIP712_SAFE_MESSAGE_TYPE,
                primaryType: "SafeMessage" as const,
                message: { message },
            });

            const passkeySignature = await sign(hash, [publicKeyCredential]);

            return buildSignatureBytes([
                {
                    signer: passkeySignerAddress,
                    data: passkeySignature.signature,
                    dynamic: true,
                },
            ]) as Hex;
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async signTypedData() {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
    });

    return {
        ...account,
        address: smartAccountAddress,
        source: "safeWebAuthnSigner",
        // Sign a user operation
        async signUserOperation(userOperation) {
            const hash = hashTypedData({
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
            });

            const passkeySignature = await sign(hash, [publicKeyCredential]);

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
        async getDummySignature() {
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
