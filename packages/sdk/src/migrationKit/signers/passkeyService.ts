import { NoPasskeySignerFoundInDBError, SignerNotOwnerError } from "@/errors";
import psl from "psl";
import type { ParsedDomain } from "psl";
import {
    type Address,
    type Chain,
    type Hex,
    encodeAbiParameters,
    hexToBigInt,
    hexToBytes,
    padHex,
    parseAbiParameters,
    toHex,
} from "viem";
import type { LEGACY_API } from "../services/LEGACY_API";
import { isSigner } from "../services/safe";
import type { WebAuthnSigner } from "../types";
import * as utils from "./utils";

const challengePrefix = "226368616c6c656e6765223a";

const _formatSigningRpId = (): string | undefined => {
    const rootDomain = (psl.parse(window.location.host) as ParsedDomain).domain;

    if (!rootDomain) return undefined;

    return rootDomain;
};

const signWithCredential = async (
    challenge: BufferSource,
    publicKeyCredential?: PublicKeyCredentialDescriptor[]
): Promise<any> => {
    const assertionPayload: any = await navigator.credentials.get({
        publicKey: {
            challenge,
            rpId: _formatSigningRpId(),
            allowCredentials: publicKeyCredential || [],
            userVerification: "required",
            timeout: 30000,
        },
    });

    return assertionPayload;
};

const getWebAuthnSignature = async (
    hash: string,
    publicKeyCredential?: PublicKeyCredentialDescriptor[]
): Promise<{ encodedSignature: string; publicKeyId: string }> => {
    const challenge = utils.parseHex(hash.slice(2));
    const assertionPayload = await signWithCredential(
        challenge,
        publicKeyCredential
    );
    const publicKeyId = utils.hexArrayStr(assertionPayload.rawId);

    const {
        signature,
        authenticatorData,
        clientDataJSON: clientData,
    } = assertionPayload.response;

    const rs = utils.derToRS(new Uint8Array(signature));

    const challengeOffset = utils.getChallengeOffset(
        clientData,
        challengePrefix
    );

    const encodedSignature = encodeAbiParameters(
        parseAbiParameters("bytes, bytes, uint256, uint256[2]"),
        [
            utils.hexArrayStr(authenticatorData) as Hex,
            utils.hexArrayStr(clientData) as Hex,
            challengeOffset,
            [
                BigInt(utils.hexArrayStr(rs[0]) as Hex),
                BigInt(utils.hexArrayStr(rs[1]) as Hex),
            ],
        ]
    );

    return { encodedSignature, publicKeyId };
};

const formatToSafeContractSignature = (
    signerAddress: string,
    signature: string
): string => {
    const dataOffsetInBytes = 65n;

    // signature verifier and data position
    const verifierAndDataPosition = encodeAbiParameters(
        parseAbiParameters("uint256, uint256"),
        [hexToBigInt(signerAddress as Address), dataOffsetInBytes]
    );

    // signature type, 0 here
    const signatureType = "00";

    // Convert signature to bytes to get correct length
    const signatureBytes = hexToBytes(signature as Hex);

    // zero padded length of verified signature
    const signatureLength = padHex(toHex(signatureBytes.length), {
        size: 32,
    }).slice(2);

    // signatures bytes that are verified by the signature verifier
    const data = signature.slice(2);

    return `${verifierAndDataPosition}${signatureType}${signatureLength}${data}`;
};

const getSigner = async ({
    API,
    walletAddress,
    chain,
}: {
    API: LEGACY_API;
    walletAddress: string;
    chain: Chain;
}): Promise<WebAuthnSigner> => {
    const webAuthnSigners =
        await API.getWebAuthnSignersByWalletAddress(walletAddress);

    if (webAuthnSigners.length === 0) throw new NoPasskeySignerFoundInDBError();

    /* Retrieve potentiel WebAuthn credentials in storage */
    const localStorageWebauthnCredentials =
        getWebauthnCredentialsInStorage(walletAddress);

    if (!localStorageWebauthnCredentials)
        throw new NoPasskeySignerFoundInDBError();

    /* Check if storage WebAuthn credentials exists in db */
    const registeredWebauthnSigner = await API.getWebAuthnSignerByPublicKeyId(
        JSON.parse(localStorageWebauthnCredentials).publicKeyId
    );

    const isOwner = await isSigner(
        registeredWebauthnSigner.signerAddress as Address,
        walletAddress as Address,
        chain,
        API
    );

    if (!isOwner) throw new SignerNotOwnerError();

    return registeredWebauthnSigner;
};

const getWebauthnCredentialsInStorage = (
    walletAddress: string
): string | null => {
    return window.localStorage.getItem(`cometh-connect-${walletAddress}`);
};

export { getWebAuthnSignature, formatToSafeContractSignature, getSigner };
