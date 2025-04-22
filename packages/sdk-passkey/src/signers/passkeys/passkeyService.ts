import { isSafeOwner } from "@/accounts/safe/services/safe";
import type { API } from "@/services/API";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import CBOR from "cbor-js";
import elliptic from "elliptic";
import * as psl from "psl";
import type { ParsedDomain } from "psl";
import {
    type Address,
    type Chain,
    type Hex,
    type PublicClient,
    encodeAbiParameters,
    hashMessage,
    keccak256,
    toBytes,
    toHex,
} from "viem";
import {
    FailedToGeneratePasskeyError,
    NoPasskeySignerFoundForGivenChain,
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
    PasskeyCreationError,
    PasskeySignatureFailedError,
    RetrieveWalletFromPasskeyError,
    SignerNotOwnerError,
} from "@/errors";
import {
    extractClientDataFields,
    extractSignature,
    hexArrayStr,
    parseHex,
} from "../passkeys/utils";
import type { Signer } from "../types";
import type {
    Assertion,
    PasskeyCredential,
    PasskeyLocalStorageFormat,
    WebAuthnSigner,
    webAuthnOptions,
} from "./types";

const EC = elliptic.ec;

const _formatCreatingRpId = (
    fullDomainSelected: boolean
): { name: string; id?: string } => {
    const rootDomain = (psl.parse(window.location.host) as ParsedDomain).domain;

    if (!rootDomain) return { name: "localhost" };

    return fullDomainSelected
        ? {
              name: window.location.host,
              id: window.location.host,
          }
        : {
              name: rootDomain,
              id: rootDomain,
          };
};

const _formatSigningRpId = (
    fullDomainSelected: boolean
): string | undefined => {
    const rootDomain = (psl.parse(window.location.host) as ParsedDomain).domain;

    if (!rootDomain) return undefined;

    return fullDomainSelected ? window.location.host : rootDomain;
};

const createPasskeySigner = async ({
    api,
    webAuthnOptions,
    passKeyName,
    fullDomainSelected,
    safeWebAuthnSharedSignerAddress,
}: {
    api: API;
    webAuthnOptions: webAuthnOptions;
    passKeyName?: string;
    fullDomainSelected: boolean;
    safeWebAuthnSharedSignerAddress?: Address;
}): Promise<PasskeyLocalStorageFormat> => {
    try {
        const name = passKeyName || "Cometh Connect";
        const authenticatorSelection = webAuthnOptions?.authenticatorSelection;
        const extensions = webAuthnOptions?.extensions;

        const passkeyCredential = (await navigator.credentials.create({
            publicKey: {
                rp: _formatCreatingRpId(fullDomainSelected),
                user: {
                    id: crypto.getRandomValues(new Uint8Array(32)),
                    name,
                    displayName: name,
                },
                attestation: "none",
                authenticatorSelection,
                timeout: 60000,
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },
                    { alg: -257, type: "public-key" },
                ],
                extensions,
            },
        })) as PasskeyCredential;

        if (!passkeyCredential) {
            throw new FailedToGeneratePasskeyError();
        }

        const publicKeyAlgorithm =
            passkeyCredential.response.getPublicKeyAlgorithm();

        const attestationObject =
            passkeyCredential?.response?.attestationObject;

        // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        let attestation: any;
        if (attestationObject instanceof ArrayBuffer) {
            attestation = CBOR.decode(attestationObject);
        } else {
            // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
            attestation = CBOR.decode((attestationObject as any).buffer);
        }

        const authData = parseAuthenticatorData(attestation.authData);

        const credentialPublicKeyBuffer = authData?.credentialPublicKey
            ?.buffer as ArrayBufferLike;

        const publicKey = CBOR.decode(credentialPublicKeyBuffer);
        const x = publicKey[-2];
        const y = publicKey[-3];
        const curve = new EC("p256");
        const point = curve.curve.point(x, y);

        const publicKeyX = `0x${point.getX().toString(16)}` as Hex;
        const publicKeyY = `0x${point.getY().toString(16)}` as Hex;
        const publicKeyId = hexArrayStr(passkeyCredential.rawId) as Hex;

        const signerAddress =
            safeWebAuthnSharedSignerAddress ??
            (await api.predictWebAuthnSignerAddress({
                publicKeyX: publicKeyX,
                publicKeyY: publicKeyY,
            }));

        // Create a PasskeyCredentialWithPubkeyCoordinates object
        const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
            id: publicKeyId,
            pubkeyCoordinates: {
                x: publicKeyX,
                y: publicKeyY,
            },
            publicKeyAlgorithm,
            signerAddress,
        };

        return passkeyWithCoordinates;
    } catch (e) {
        console.log({ e });
        throw new PasskeyCreationError();
    }
};

const sign = async ({
    challenge,
    fullDomainSelected,
    publicKeyCredential,
}: {
    challenge: string;
    fullDomainSelected: boolean;
    publicKeyCredential?: PublicKeyCredentialDescriptor[];
}): Promise<{ signature: Hex; publicKeyId: Hex }> => {
    const assertion = (await navigator.credentials.get({
        publicKey: {
            challenge: toBytes(challenge),
            rpId: _formatSigningRpId(fullDomainSelected),
            allowCredentials: publicKeyCredential || [],
            userVerification: "required",
            timeout: 60000,
        },
    })) as Assertion | null;

    if (!assertion) throw new PasskeySignatureFailedError();

    const signature = encodeAbiParameters(
        [
            { type: "bytes", name: "authenticatorData" },
            { type: "bytes", name: "clientDataFields" },
            { type: "uint256[2]", name: "signature" },
        ],
        [
            toHex(new Uint8Array(assertion.response.authenticatorData)),
            extractClientDataFields(assertion.response) as Hex,
            extractSignature(assertion.response.signature),
        ]
    );

    const publicKeyId = hexArrayStr(assertion.rawId) as Hex;

    return { signature, publicKeyId };
};

const signWithPasskey = async ({
    challenge,
    webAuthnSigners,
    fullDomainSelected,
}: {
    challenge: string;
    webAuthnSigners?: WebAuthnSigner[];
    fullDomainSelected: boolean;
}): Promise<{ signature: Hex; publicKeyId: Hex }> => {
    let publicKeyCredentials: PublicKeyCredentialDescriptor[] | undefined;

    if (webAuthnSigners) {
        publicKeyCredentials = webAuthnSigners.map((webAuthnSigner) => {
            return {
                id: parseHex(webAuthnSigner.publicKeyId),
                type: "public-key",
            };
        });
    }

    const webAuthnSignature = await sign({
        challenge: keccak256(hashMessage(challenge)),
        publicKeyCredential: publicKeyCredentials,
        fullDomainSelected,
    });

    return webAuthnSignature;
};

const setPasskeyInStorage = (
    smartAccountAddress: Address,
    publicKeyId: Hex,
    publicKeyX: Hex,
    publicKeyY: Hex,
    signerAddress: Address
): void => {
    const storageKey = `cometh-connect-${smartAccountAddress}`;

    const passkeyWithCoordinates: PasskeyLocalStorageFormat = {
        id: publicKeyId,
        pubkeyCoordinates: {
            x: publicKeyX,
            y: publicKeyY,
        },
        signerAddress,
    };

    window.localStorage.setItem(
        storageKey,
        JSON.stringify(passkeyWithCoordinates)
    );
};

const getPasskeyInStorage = (
    smartAccountAddress: Address
): PasskeyLocalStorageFormat | null => {
    const storageKey = `cometh-connect-${smartAccountAddress}`;
    const storedData = window.localStorage.getItem(storageKey);

    if (!storedData) return null;

    return JSON.parse(storedData);
};

const getPasskeySigner = async ({
    api,
    smartAccountAddress,
    chain,
    publicClient,
    safeProxyFactoryAddress,
    safeSingletonAddress,
    safeModuleSetUpAddress,
    safeWebAuthnSharedSignerAddress,
    fallbackHandler,
    p256Verifier,
    multisendAddress,
    fullDomainSelected,
}: {
    api: API;
    smartAccountAddress: Address;
    chain: Chain;
    publicClient?: PublicClient;
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    safeModuleSetUpAddress: Address;
    safeWebAuthnSharedSignerAddress: Address;
    fallbackHandler: Address;
    p256Verifier: Address;
    multisendAddress: Address;
    fullDomainSelected: boolean;
}): Promise<PasskeyLocalStorageFormat> => {
    const localStoragePasskey = getPasskeyInStorage(smartAccountAddress);

    if (localStoragePasskey) {
        const passkey = localStoragePasskey as PasskeyLocalStorageFormat;

        const signer: Signer = {
            type: "passkey",
            passkey: {
                id: passkey.id as Hex,
                pubkeyCoordinates: {
                    x: passkey.pubkeyCoordinates.x as Hex,
                    y: passkey.pubkeyCoordinates.y as Hex,
                },
                signerAddress: passkey.signerAddress as Address,
            },
        };

        const isOwner = await isSafeOwner({
            safeAddress: smartAccountAddress,
            accountSigner: signer,
            chain,
            publicClient,
            safeProxyFactoryAddress,
            safeSingletonAddress,
            safeModuleSetUpAddress,
            sharedWebAuthnSignerContractAddress:
                safeWebAuthnSharedSignerAddress,
            modules: [fallbackHandler],
            fallbackHandler,
            p256Verifier,
            multisendAddress,
        });

        if (!isOwner) throw new SignerNotOwnerError();

        return passkey;
    }

    const dbPasskeySigners =
        await api.getPasskeySignersByWalletAddress(smartAccountAddress);

    if (dbPasskeySigners.length === 0)
        throw new NoPasskeySignerFoundInDBError();

    //If no local storage or no match in db, Call Webauthn API to get current signer
    let webAuthnSignature: { signature: Hex; publicKeyId: Hex };
    try {
        webAuthnSignature = await signWithPasskey({
            challenge: "SDK Connection",
            webAuthnSigners: dbPasskeySigners as WebAuthnSigner[],
            fullDomainSelected,
        });
    } catch {
        throw new NoPasskeySignerFoundInDeviceError();
    }

    const signingWebAuthnSigners = await api.getPasskeySignerByPublicKeyId(
        webAuthnSignature.publicKeyId as Hex
    );

    const webAuthnSignerForGivenChain = signingWebAuthnSigners.find(
        (signer) => +signer.chainId === chain.id
    );

    let passkeyWithCoordinates: PasskeyLocalStorageFormat;

    if (
        signingWebAuthnSigners[0]?.signerAddress !==
            safeWebAuthnSharedSignerAddress &&
        !webAuthnSignerForGivenChain
    ) {
        throw new NoPasskeySignerFoundForGivenChain();
    }

    if (webAuthnSignerForGivenChain) {
        passkeyWithCoordinates = {
            id: webAuthnSignerForGivenChain.publicKeyId as Hex,
            pubkeyCoordinates: {
                x: webAuthnSignerForGivenChain.publicKeyX as Hex,
                y: webAuthnSignerForGivenChain.publicKeyY as Hex,
            },
            signerAddress: webAuthnSignerForGivenChain.signerAddress as Address,
        };
    } else {
        passkeyWithCoordinates = {
            id: signingWebAuthnSigners[0].publicKeyId as Hex,
            pubkeyCoordinates: {
                x: signingWebAuthnSigners[0].publicKeyX as Hex,
                y: signingWebAuthnSigners[0].publicKeyY as Hex,
            },
            signerAddress: signingWebAuthnSigners[0].signerAddress as Address,
        };
    }

    setPasskeyInStorage(
        smartAccountAddress,
        passkeyWithCoordinates.id,
        passkeyWithCoordinates.pubkeyCoordinates.x,
        passkeyWithCoordinates.pubkeyCoordinates.y,
        passkeyWithCoordinates.signerAddress
    );

    return passkeyWithCoordinates;
};

const retrieveSmartAccountAddressFromPasskey = async (
    API: API,
    chain: Chain,
    fullDomainSelected: boolean
): Promise<Address> => {
    let publicKeyId: Hex;

    try {
        publicKeyId = (
            await signWithPasskey({
                challenge: "Retrieve user wallet",
                fullDomainSelected,
            })
        ).publicKeyId as Hex;
    } catch {
        throw new RetrieveWalletFromPasskeyError();
    }

    const signingPasskeySigners =
        await API.getPasskeySignerByPublicKeyId(publicKeyId);
    if (signingPasskeySigners.length === 0)
        throw new NoPasskeySignerFoundInDBError();

    const webAuthnSignerForGivenChain = signingPasskeySigners.find(
        (signer) => +signer.chainId === chain.id
    );
    if (!webAuthnSignerForGivenChain)
        throw new NoPasskeySignerFoundForGivenChain();

    const { smartAccountAddress, publicKeyX, publicKeyY, signerAddress } =
        webAuthnSignerForGivenChain;

    setPasskeyInStorage(
        smartAccountAddress as Address,
        publicKeyId,
        publicKeyX as Hex,
        publicKeyY as Hex,
        signerAddress as Address
    );

    return smartAccountAddress as Address;
};

const retrieveSmartAccountAddressFromPasskeyId = async ({
    API,
    id,
    chain,
    fullDomainSelected,
}: {
    API: API;
    id: string;
    chain: Chain;
    fullDomainSelected: boolean;
}): Promise<Address> => {
    const publicKeyCredentials = [
        {
            id: parseHex(id),
            type: "public-key",
        },
    ] as PublicKeyCredentialDescriptor[];

    let publicKeyId: Hex;

    try {
        publicKeyId = (
            await sign({
                challenge: keccak256(hashMessage("Retrieve user wallet")),
                publicKeyCredential: publicKeyCredentials,
                fullDomainSelected,
            })
        ).publicKeyId as Hex;
    } catch {
        throw new RetrieveWalletFromPasskeyError();
    }

    const signingPasskeySigners =
        await API.getPasskeySignerByPublicKeyId(publicKeyId);
    if (signingPasskeySigners.length === 0)
        throw new NoPasskeySignerFoundInDBError();

    const webAuthnSignerForGivenChain = signingPasskeySigners.find(
        (signer) => +signer.chainId === chain.id
    );
    if (!webAuthnSignerForGivenChain)
        throw new NoPasskeySignerFoundForGivenChain();

    const { smartAccountAddress, publicKeyX, publicKeyY, signerAddress } =
        webAuthnSignerForGivenChain;

    setPasskeyInStorage(
        smartAccountAddress as Address,
        publicKeyId,
        publicKeyX as Hex,
        publicKeyY as Hex,
        signerAddress as Address
    );

    return smartAccountAddress as Address;
};

export {
    createPasskeySigner,
    getPasskeyInStorage,
    getPasskeySigner,
    setPasskeyInStorage,
    sign,
    retrieveSmartAccountAddressFromPasskey,
    retrieveSmartAccountAddressFromPasskeyId,
};
