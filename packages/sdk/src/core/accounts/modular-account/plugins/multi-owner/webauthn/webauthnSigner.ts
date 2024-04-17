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
    keccak256,
    stringToBytes,
    toHex,
    concat,
} from "viem";
import { signMessage } from "viem/actions";
import { MultiOwnerPlugin, MultiOwnerPluginAbi } from "../plugin.js";
import type { PasskeyLocalStorageFormat } from "@/core/signers/passkeys/types.js";
import { arrayBufferToBase64, base64ToBase64Url, decodeUTF8, encodeUTF8, getChallengeOffset, parseHex, uint8ArrayToBase64 } from "@/core/signers/passkeys/utils.js";
import { sign } from "@/core/signers/passkeys/passkeyService.js";

/**
 * Represent the layout of the calldata used for a webauthn signature
 */
const webAuthnSignatureParams = [
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
        async getDummySignature(uoHash: `0x${string}`) {
            
            const challengePrefix = '226368616c6c656e6765223a'
            const authenticatorData = '0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000' as Hex

            const fakeUserOpHash = "0x7df9c97a00e3c7aaf0865bea456aea92c1b9789e876f5b0e5208e657a03eee82"


            const encodedChallenge = toHex(base64ToBase64Url(uint8ArrayToBase64(parseHex(keccak256(uoHash)))))
            const clientDataStart = "0x7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22" as Hex;
            const clientDataEnd = "0x222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a33303032222c2263726f73734f726967696e223a66616c73657d" as Hex;
          
            const clientData = concat([clientDataStart, encodedChallenge, clientDataEnd])

            const challengeOffset = getChallengeOffset(parseHex(clientData), challengePrefix)
            const randomR = BigInt("32418570922385826632603674026792362539561286741521108784221695596970723721722") 
            const randomS = BigInt("82780238788852460400382712504839357697933178996887203926987723829670460663887") 


 
            const dummyWebauthnPayload = {
                authenticatorData: authenticatorData as Hex,
                clientData: clientData  as Hex,
                challengeOffset: challengeOffset as unknown as bigint,
                rs: [randomR, randomS],
            }

            console.log({dummyWebauthnPayload})

            const sig = encodeAbiParameters(webAuthnSignatureParams, [
                dummyWebauthnPayload.authenticatorData ,
                dummyWebauthnPayload.clientData,
                dummyWebauthnPayload.challengeOffset ,
                [dummyWebauthnPayload.rs[0], dummyWebauthnPayload.rs[1]]
            ]);

            console.log({sig})

            


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
           
          // Sign the hash with the P256 signer
          const {
            authenticatorData,
            clientData,
            challengeOffset,
            signature,
        } = await sign(uoHash, [publicKeyCredential]);


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


