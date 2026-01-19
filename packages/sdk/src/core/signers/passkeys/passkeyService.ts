import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { isSafeOwner } from "@/core/accounts/safe/services/safe";
import type { API } from "@/core/services/API";
import { isTauri } from "@/core/services/tauri/platform";
import {
    getTauriCreateFn,
    getTauriGetFn,
} from "@/core/services/tauri/tauriBridge";
import type { LEGACY_API } from "@/migrationKit/services/LEGACY_API";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import CBOR from "cbor-js";
import elliptic from "elliptic";
import { WebAuthnP256 } from "ox";
import { isSmartAccountDeployed } from "permissionless";
import * as psl from "psl";
import {
    http,
    type Address,
    type Chain,
    type Hex,
    type PublicClient,
    createPublicClient,
    encodeAbiParameters,
    getContract,
    hashMessage,
    hexToBytes,
    keccak256,
} from "viem";
import {
    FailedToGeneratePasskeyError,
    NoPasskeySignerFoundForGivenChain,
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
    NoPasskeySignerFoundInLegacyDBError,
    PasskeyCreationError,
    PasskeySignatureFailedError,
    PasskeySignerFoundInLegacyDBError,
    RetrieveWalletFromPasskeyError,
    SignerNotOwnerError,
} from "../../../errors";
import {
    arrayBufferToBase64,
    base64ToBase64Url,
    extractClientDataFields,
    hexArrayStr,
    parseHex,
    uint8ArrayToBase64,
} from "../passkeys/utils";
import type { Signer } from "../types";
import type {
    OxPasskeyCredential,
    PasskeyLocalStorageFormat,
    WebAuthnSigner,
    webAuthnOptions,
} from "./types";

const EC = elliptic.ec;

const _formatCreatingRpId = (
    fullDomainSelected: boolean,
    tauriOptions?: webAuthnOptions["tauriOptions"]
): { name: string; id: string } => {
    if (isTauri()) {
        if (!tauriOptions?.rpId) throw new Error("Tauri RP ID is required");

        return {
            name: "Cometh Connect",
            id: tauriOptions.rpId,
        };
    }

    const rootDomain = (psl.parse(window.location.host) as psl.ParsedDomain)
        .domain;

    if (!rootDomain) return { name: "localhost", id: "localhost" };

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
    fullDomainSelected: boolean,
    tauriOptions?: webAuthnOptions["tauriOptions"]
): string | undefined => {
    if (isTauri()) {
        if (!tauriOptions?.rpId) throw new Error("Tauri RP ID is required");
        return tauriOptions.rpId;
    }
    const rootDomain = (psl.parse(window.location.host) as psl.ParsedDomain)
        .domain;

    if (!rootDomain) return undefined;

    return fullDomainSelected ? window.location.host : rootDomain;
};

// ox's WebAuthnP256.sign expects `credentialId` as a base64url string.
// Convert from possible inputs (hex string, ArrayBuffer, TypedArray, base64) to base64url.
const _formatCredentialIdForOx = (id: unknown): string | undefined => {
    if (!id) return undefined;

    // Already base64url
    if (typeof id === "string" && /^[A-Za-z0-9_-]+$/.test(id)) {
        return id;
    }

    // Hex string (0x…)
    if (typeof id === "string" && id.startsWith("0x")) {
        const bytes = hexToBytes(id as `0x${string}`);
        return base64ToBase64Url(uint8ArrayToBase64(bytes));
    }

    // ArrayBuffer
    if (id instanceof ArrayBuffer) {
        return base64ToBase64Url(arrayBufferToBase64(id));
    }

    // TypedArray / Uint8Array
    if (ArrayBuffer.isView(id)) {
        const view = id as ArrayBufferView;
        const bytes = new Uint8Array(
            view.buffer,
            view.byteOffset,
            view.byteLength
        );
        return base64ToBase64Url(uint8ArrayToBase64(bytes));
    }

    return undefined;
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
        const name = passKeyName || "Cometh";
        const extensions = webAuthnOptions?.extensions;

        const tauriCreateFn =
            webAuthnOptions?.tauriOptions &&
            getTauriCreateFn(webAuthnOptions?.tauriOptions);

        const passkeyCredential = (await WebAuthnP256.createCredential({
            rp: _formatCreatingRpId(
                fullDomainSelected,
                webAuthnOptions?.tauriOptions
            ),
            user: {
                name,
                displayName: name,
            },
            attestation: "none",
            authenticatorSelection: webAuthnOptions?.authenticatorSelection,
            timeout: 60_000,
            extensions,
            ...(tauriCreateFn && { createFn: tauriCreateFn }),
        })) as unknown as OxPasskeyCredential;

        if (!passkeyCredential) {
            throw new FailedToGeneratePasskeyError();
        }

        const publicKeyAlgorithm =
            passkeyCredential.raw.response.getPublicKeyAlgorithm();

        const attestationObject =
            passkeyCredential?.raw?.response?.attestationObject;

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
            ?.buffer as ArrayBuffer;

        const publicKey = CBOR.decode(credentialPublicKeyBuffer);
        const x = publicKey[-2];
        const y = publicKey[-3];
        const curve = new EC("p256");
        const point = curve.curve.point(x, y);

        const publicKeyX = `0x${point.getX().toString(16)}` as Hex;
        const publicKeyY = `0x${point.getY().toString(16)}` as Hex;
        const publicKeyId = hexArrayStr(passkeyCredential.raw.rawId) as Hex;

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
    rpId,
    tauriOptions,
}: {
    challenge: string;
    fullDomainSelected: boolean;
    publicKeyCredential?: PublicKeyCredentialDescriptor[];
    rpId?: string;
    tauriOptions?: webAuthnOptions["tauriOptions"];
}): Promise<{ signature: Hex; publicKeyId: Hex }> => {
    // Only pass getFn if defined (Android), omit for iOS/web to use browser default
    const tauriGetFn = tauriOptions && getTauriGetFn(tauriOptions);

    const assertion = await WebAuthnP256.sign({
        challenge: challenge as Hex,
        ...(publicKeyCredential?.length && {
            credentialId: _formatCredentialIdForOx(publicKeyCredential[0].id),
        }),
        rpId: rpId || _formatSigningRpId(fullDomainSelected, tauriOptions),
        userVerification: "required",
        ...(tauriGetFn && { getFn: tauriGetFn }),
    });

    if (!assertion) throw new PasskeySignatureFailedError();

    const signature = encodeAbiParameters(
        [
            { type: "bytes", name: "authenticatorData" },
            { type: "bytes", name: "clientDataFields" },
            { type: "uint256[2]", name: "signature" },
        ],
        [
            assertion.metadata.authenticatorData as Hex,
            extractClientDataFields(assertion.raw.response) as Hex,
            [BigInt(assertion.signature.r), BigInt(assertion.signature.s)],
        ]
    );

    const publicKeyId = hexArrayStr(assertion.raw.rawId) as Hex;

    return { signature, publicKeyId };
};

const signWithPasskey = async ({
    challenge,
    webAuthnSigners,
    fullDomainSelected,
    rpId,
    tauriOptions,
}: {
    challenge: string;
    webAuthnSigners?: WebAuthnSigner[];
    fullDomainSelected: boolean;
    rpId?: string;
    tauriOptions?: webAuthnOptions["tauriOptions"];
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
        rpId,
        tauriOptions,
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
    rpId,
    tauriOptions,
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
    rpId?: string;
    tauriOptions?: webAuthnOptions["tauriOptions"];
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
            rpId,
            tauriOptions,
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
    fullDomainSelected: boolean,
    rpId?: string,
    publicClient?: PublicClient,
    legacyAPI?: LEGACY_API,
    tauriOptions?: webAuthnOptions["tauriOptions"]
): Promise<Address> => {
    let publicKeyId: Hex;

    try {
        publicKeyId = (
            await signWithPasskey({
                challenge: "Retrieve user wallet",
                fullDomainSelected,
                rpId,
                tauriOptions,
            })
        ).publicKeyId as Hex;
    } catch {
        throw new RetrieveWalletFromPasskeyError();
    }

    const signingPasskeySigners =
        await API.getPasskeySignerByPublicKeyId(publicKeyId);

    if (signingPasskeySigners.length === 0) {
        if (!legacyAPI) throw new NoPasskeySignerFoundInDBError();

        const legacySigningPasskeySigner =
            await legacyAPI.getWebAuthnSignerByPublicKeyId(publicKeyId);

        if (!legacySigningPasskeySigner)
            throw new NoPasskeySignerFoundInLegacyDBError();

        throw new PasskeySignerFoundInLegacyDBError();
    }

    const webAuthnSignerForGivenChain = signingPasskeySigners.find(
        (signer) => +signer.chainId === chain.id
    );
    if (!webAuthnSignerForGivenChain)
        throw new NoPasskeySignerFoundForGivenChain();

    const { smartAccountAddress, publicKeyX, publicKeyY, signerAddress } =
        webAuthnSignerForGivenChain;

    await _checkIfOwner({
        smartAccountAddress: smartAccountAddress as Address,
        signerAddress: signerAddress as Address,
        chain,
        publicClient: publicClient as PublicClient,
    });

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
    publicClient,
    rpId,
    tauriOptions,
}: {
    API: API;
    id: string;
    chain: Chain;
    fullDomainSelected: boolean;
    publicClient?: PublicClient;
    rpId?: string;
    tauriOptions?: webAuthnOptions["tauriOptions"];
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
                rpId,
                tauriOptions,
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

    await _checkIfOwner({
        chain,
        smartAccountAddress: smartAccountAddress as Address,
        signerAddress: signerAddress as Address,
        publicClient: publicClient as PublicClient,
    });

    setPasskeyInStorage(
        smartAccountAddress as Address,
        publicKeyId,
        publicKeyX as Hex,
        publicKeyY as Hex,
        signerAddress as Address
    );

    return smartAccountAddress as Address;
};

const _checkIfOwner = async ({
    chain,
    smartAccountAddress,
    signerAddress,
    publicClient,
}: {
    chain: Chain;
    smartAccountAddress: Address;
    signerAddress: Address;
    publicClient: PublicClient;
}) => {
    const _publicClient =
        publicClient ??
        createPublicClient({
            chain,
            transport: http(),
        });

    const safe = getContract({
        address: smartAccountAddress as Address,
        abi: SafeAbi,
        client: _publicClient,
    });

    const isSafeDeployed = await isSmartAccountDeployed(
        _publicClient,
        smartAccountAddress as Address
    );
    if (!isSafeDeployed) return;

    const isSignerOwner = await safe.read.isOwner([signerAddress]);

    if (!isSignerOwner) throw new SignerNotOwnerError();
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
