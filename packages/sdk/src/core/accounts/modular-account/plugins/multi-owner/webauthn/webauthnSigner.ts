import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts";
import {
    type Address,
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type LocalAccount,
    type SignableMessage,
    type Transport,
    type TypedData,
    type TypedDataDefinition,
    hashMessage,
    hashTypedData,
    encodeAbiParameters,
    encodePacked,
    maxUint256,
    hexToBigInt,
} from "viem";
import { signMessage } from "viem/actions";
import { MultiOwnerPlugin, MultiOwnerPluginAbi } from "../plugin.js";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types.js";
import { parseHex } from "@/core/signers/passkeys/utils.js";
import { sign } from "@/core/signers/passkeys/passkeyService.js";

/**
 * Represent the layout of the calldata used for a webauthn signature
 */
const webAuthnSignatureLayoutParam = [
    { name: "authenticatorData", type: "bytes" },
    { name: "clientData", type: "bytes" },
    { name: "challengeOffset", type: "uint256" },
    { name: "rs", type: "uint256[2]" },
] as const;

export const WebauthnMessageSigner = <
    TTransport extends Transport,
    TChain extends Chain | undefined = Chain | undefined,
>(
    client: Client<TTransport, TChain, undefined>,
    passkey: PasskeyLocalStorageFormat,
) => {


    const publicKeyCredential: PublicKeyCredentialDescriptor = {
        id: parseHex(passkey.id),
        type: "public-key",
    };


    return {
        async getDummySignature() {
          /*   // The max curve value for p256 signature stuff
            const maxCurveValue =
                BigInt(
                    "0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551"
                ) - 1n;

            // Generate a template signature for the webauthn validator
            const sig = encodeAbiParameters(webAuthnSignatureLayoutParam, [
                // Random 120 byte
                `0x${maxUint256.toString(16).repeat(2)}`,
                `0x${maxUint256.toString(16).repeat(6)}`,
                maxUint256,
                [maxCurveValue, maxCurveValue],
            ]); */

            const sig = `0x${'a0'.repeat(20)}`

            console.log("length", sig.length)

            // return the coded signature
            return sig;
        },
        async signMessage({ message }:{message:SignableMessage}) {
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
                authenticatorData,
                clientData,
                challengeOffset,
                [BigInt(signature.r), BigInt(signature.s)],
            ]);
        },
        signUserOperationHash: async (
            uoHash: `0x${string}`
        ): Promise<`0x${string}`> => {
            const hash = encodeAbiParameters([{name: uoHash, type:"bytes"}], [uoHash]);
          // Sign the hash with the P256 signer
          const {
            authenticatorData,
            clientData,
            challengeOffset,
            signature,
        } = await sign(hash, [publicKeyCredential]);

        console.log({authenticatorData, clientData, challengeOffset, signature})

        // Encode the signature with the web auth n validator info
        const encodedSignature = encodeAbiParameters(
            webAuthnSignatureLayoutParam,
            [
                authenticatorData as Hex,
                clientData as Hex,
                challengeOffset as unknown as bigint,
                [BigInt(signature.r), BigInt(signature.s)],
            ]
        );
            return encodedSignature;
        },
    };
};
