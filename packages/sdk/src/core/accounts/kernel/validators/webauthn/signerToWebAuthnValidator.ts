import type { KernelValidator } from "@zerodev/sdk/types";
import { getUserOperationHash } from "permissionless";
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";
import {
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    concatHex,
    encodeAbiParameters,
    encodePacked,
    hashMessage,
    maxUint256,
} from "viem";
import { toAccount } from "viem/accounts";

import type { EntryPoint } from "permissionless/_types/types";
import { getChainId } from "viem/actions";
import { ENTRYPOINT_ADDRESS_V06 } from "../../../../../constants";
import { sign } from "../../../../signers/passkeys/passkeyService";
import type { PasskeyLocalStorageFormat } from "../../../../signers/passkeys/types";
import { parseHex } from "../../../../signers/passkeys/utils";
import type { UserOperation } from "../../../../types";
import { KERNEL_ADDRESSES } from "../../constants";

/**
 * Represent the layout of the calldata used for a webauthn signature
 */
const webAuthnSignatureLayoutParam = [
    { name: "useOnChainP256Verifier", type: "bool" },
    { name: "authenticatorData", type: "bytes" },
    { name: "clientData", type: "bytes" },
    { name: "challengeOffset", type: "uint256" },
    { name: "rs", type: "uint256[2]" },
] as const;

/**
 * Build a kernel validator from a passkey, that use the webauthn validator behind the scene
 * @param client
 * @param passkey
 * @param entryPoint
 * @param webAuthnValidatorAddress
 */
export async function signerToWebAuthnValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        passkey,
        entryPoint = ENTRYPOINT_ADDRESS_V06,
        webAuthnValidatorAddress = KERNEL_ADDRESSES.WEB_AUTHN_VALIDATOR,
    }: {
        passkey: PasskeyLocalStorageFormat;
        entryPoint?: Address;
        webAuthnValidatorAddress?: Address;
    }
): Promise<KernelValidator<"WebAuthnValidator">> {
    // Fetch chain id
    const chainId = await getChainId(client);

    const publicKeyCredential: PublicKeyCredentialDescriptor = {
        id: parseHex(passkey.id),
        type: "public-key",
    };

    // Build the WebAuthn Signer
    const account = toAccount({
        address: webAuthnValidatorAddress,
        async signMessage({ message }) {
            // Encode the msg
            const challenge = hashMessage(message);
            // Sign it
            const {
                authenticatorData,
                clientData,
                challengeOffset,
                signature,
            } = await sign(challenge, [publicKeyCredential]);

            // Return the encoded stuff for the web auth n validator
            return encodePacked(webAuthnSignatureLayoutParam, [
                false,
                authenticatorData,
                clientData,
                challengeOffset,
                [BigInt(signature.r), BigInt(signature.s)],
            ]);
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
        address: webAuthnValidatorAddress,
        source: "WebAuthnValidator",

        async getEnableData() {
            const { x, y } = passkey.pubkeyCoordinates;

            return concatHex([x, y]);
        },
        async getNonceKey() {
            return BigInt(0);
        },
        // Sign a user operation
        async signUserOperation(userOperation: UserOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x",
                },
                entryPoint: entryPoint as EntryPoint,
                chainId: chainId,
            });
            // Sign the hash with the P256 signer
            const {
                authenticatorData,
                clientData,
                challengeOffset,
                signature,
            } = await sign(hash, [publicKeyCredential]);

            // Encode the signature with the web auth n validator info
            const encodedSignature = encodeAbiParameters(
                webAuthnSignatureLayoutParam,
                [
                    false,
                    authenticatorData as Hex,
                    clientData as Hex,
                    challengeOffset as unknown as bigint,
                    [BigInt(signature.r), BigInt(signature.s)],
                ]
            );

            // Always use the sudo mode, since we are starting from the postula that this p256 signer is the default one for the smart account
            return concatHex(["0x00000000", encodedSignature]);
        },

        /**
         * Get a dummy signature for this smart account
         */
        async getDummySignature() {
            // The max curve value for p256 signature stuff
            const maxCurveValue =
                BigInt(
                    "0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551"
                ) - 1n;

            // Generate a template signature for the webauthn validator
            const sig = encodeAbiParameters(webAuthnSignatureLayoutParam, [
                false,
                // Random 120 byte
                `0x${maxUint256.toString(16).repeat(2)}`,
                `0x${maxUint256.toString(16).repeat(6)}`,
                maxUint256,
                [maxCurveValue, maxCurveValue],
            ]);

            // return the coded signature
            return concatHex(["0x00000000", sig]);
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false;
        },
    };
}
