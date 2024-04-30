import {
    type Hex,
    type SignableMessage,
    concat,
    encodeAbiParameters,
    encodePacked,
    hashMessage,
    hexToString,
    keccak256,
    toHex,
} from "viem";

import { sign } from "@/core/signers/passkeys/passkeyService.js";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types.js";
import {
    base64ToBase64Url,
    encodeUTF8,
    getChallengeOffset,
    parseHex,
    uint8ArrayToBase64,
} from "@/core/signers/passkeys/utils.js";
import type { MultiOwnerSigner } from "../../types";

/**
 * Represent the layout of the calldata used for a webauthn signature
 */
const webAuthnSignatureParams = [
    { name: "authenticatorData", type: "bytes" },
    { name: "clientData", type: "bytes" },
    { name: "challengeOffset", type: "uint256" },
    { name: "rs", type: "uint256[2]" },
] as const;

export const WebauthnMessageSigner = (
    passkey: PasskeyLocalStorageFormat
): MultiOwnerSigner => {
    const publicKeyCredential: PublicKeyCredentialDescriptor = {
        id: parseHex(passkey.id),
        type: "public-key",
    };

    return {
        // authenticatorData, clientData and challenge offset are hardcoded from a value that matches a webauthn signature
        getDummySignature(uoHash: Hex): Hex {
            const challengePrefix = "226368616c6c656e6765223a";
            const authenticatorData =
                "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000" as Hex;
            const encodedChallenge = toHex(
                base64ToBase64Url(
                    uint8ArrayToBase64(parseHex(keccak256(uoHash)))
                )
            );

            const clientDataStart =
                "0x7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22" as Hex;
            const clientDataEnd =
                "0x222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a33303032222c2263726f73734f726967696e223a66616c73657d" as Hex;

            const clientData = concat([
                clientDataStart,
                encodedChallenge,
                clientDataEnd,
            ]);

            const challengeOffset = getChallengeOffset(
                encodeUTF8(hexToString(clientData)),
                challengePrefix
            );

            const randomR = BigInt(
                "32418570922385826632603674026792362539561286741521108784221695596970723721722"
            );

            const randomS = BigInt(
                "82780238788852460400382712504839357697933178996887203926987723829670460663887"
            );

            const dummyWebauthnPayload = {
                authenticatorData: authenticatorData,
                clientData: clientData,
                // precalculated challenge offset
                challengeOffset: BigInt(challengeOffset),
                rs: [randomR, randomS],
            };

            return encodeAbiParameters(webAuthnSignatureParams, [
                dummyWebauthnPayload.authenticatorData,
                dummyWebauthnPayload.clientData,
                dummyWebauthnPayload.challengeOffset,
                [dummyWebauthnPayload.rs[0], dummyWebauthnPayload.rs[1]],
            ]);
        },
        async signMessage({
            message,
        }: { message: SignableMessage }): Promise<Hex> {
            const challenge = hashMessage(message);

            const {
                authenticatorData,
                clientData,
                challengeOffset,
                signature,
            } = await sign(keccak256(challenge), [publicKeyCredential]);

            return encodePacked(webAuthnSignatureParams, [
                authenticatorData,
                clientData,
                challengeOffset,
                [BigInt(signature.r), BigInt(signature.s)],
            ]);
        },
        async signUserOperationHash(uoHash: Hex): Promise<Hex> {
            const {
                authenticatorData,
                clientData,
                challengeOffset,
                signature,
            } = await sign(keccak256(uoHash), [publicKeyCredential]);

            return encodeAbiParameters(webAuthnSignatureParams, [
                authenticatorData as Hex,
                clientData as Hex,
                challengeOffset as unknown as bigint,
                [
                    signature.r as unknown as bigint,
                    signature.s as unknown as bigint,
                ],
            ]);
        },
    };
};
