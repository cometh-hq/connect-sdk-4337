import * as psl from "psl";
import { maxUint256, toBytes, toHex } from "viem";

import type { webAuthnOptions } from "./types";

export const challengePrefix = "226368616c6c656e6765223a";

export const DEFAULT_WEBAUTHN_OPTIONS: webAuthnOptions = {
    // authenticatorSelection documentation can be found here: https://www.w3.org/TR/webauthn-2/#dictdef-authenticatorselectioncriteria
    authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
    },
};

export const rpId = (): { name: string; id?: string } => {
    if (typeof window === "undefined") return { name: "localhost" };

    const rootDomain = (psl.parse(window.location.host) as psl.ParsedDomain)
        .domain as string;

    return rootDomain
        ? {
              name: rootDomain,
              id: rootDomain,
          }
        : { name: "localhost" };
};

export const hexArrayStr = (array: ArrayBuffer): string =>
    new Uint8Array(array).reduce(
        (acc, v) => acc + v.toString(16).padStart(2, "0"),
        "0x"
    );

export const parseHex = (str: string): Uint8Array => {
    const matches = str.match(/[\da-f]{2}/gi);
    if (matches === null) {
        return new Uint8Array();
    }
    return new Uint8Array(matches.map((h: string) => parseInt(h, 16)));
};

export const derToRS = (der: Uint8Array): Uint8Array[] => {
    let offset = 3;
    let dataOffset: number;

    if (der[offset] === 0x21) {
        dataOffset = offset + 2;
    } else {
        dataOffset = offset + 1;
    }
    const r = der.slice(dataOffset, dataOffset + 32);
    offset = offset + der[offset] + 1 + 1;
    if (der[offset] === 0x21) {
        dataOffset = offset + 2;
    } else {
        dataOffset = offset + 1;
    }

    const s = der.slice(dataOffset, dataOffset + 32);
    return [r, s];
};

export const findSequence = (arr: Uint8Array, seq: Uint8Array): number => {
    for (let i = 0; i < arr.length; ++i) {
        for (let j = 0; j < seq.length; j++) {
            if (arr[i + j] !== seq[j]) {
                break;
            }
            if (j === seq.length - 1) {
                return i;
            }
        }
    }
    return -1;
};

export const getChallengeOffset = (
    clientData: ArrayBuffer,
    challengePrefix: string
): number => {
    return (
        findSequence(new Uint8Array(clientData), parseHex(challengePrefix)) +
        12 +
        1
    );
};

export const decodeUTF8 = (b: ArrayBuffer): string => {
    return new TextDecoder().decode(b);
};

export const encodeUTF8 = (s: string): ArrayBuffer => {
    return new TextEncoder().encode(s);
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const base64toUint8Array = (base64: string): Uint8Array => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

export const base64ToBase64Url = (base64: string) => {
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const isWebAuthnCompatible = async (
    webAuthnOptions: webAuthnOptions
): Promise<boolean> => {
    try {
        if (typeof window === "undefined" || !window.PublicKeyCredential)
            return false;

        if (
            webAuthnOptions.authenticatorSelection?.authenticatorAttachment ===
            "platform"
        ) {
            const isUserVerifyingPlatformAuthenticatorAvailable =
                await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

            if (!isUserVerifyingPlatformAuthenticatorAvailable) return false;
        }

        return true;
    } catch {
        return false;
    }
};

/**
 * Compute the additional client data JSON fields. This is the fields other than `type` and
 * `challenge` (including `origin` and any other additional client data fields that may be
 * added by the authenticator).
 *
 * See <https://w3c.github.io/webauthn/#clientdatajson-serialization>
 */
export function extractClientDataFields(
    response: AuthenticatorAssertionResponse
): string {
    const clientDataJSON = new TextDecoder("utf-8").decode(
        response.clientDataJSON
    );
    const match = clientDataJSON.match(
        /^\{"type":"webauthn.get","challenge":"[A-Za-z0-9\-_]{43}",(.*)\}$/
    );

    if (!match) {
        throw new Error("challenge not found in client data JSON");
    }

    const [, fields] = match;
    return toHex(toBytes(fields));
}

/**
 * Extracts the signature into R and S values from the authenticator response.
 *
 * See:
 * - <https://datatracker.ietf.org/doc/html/rfc3279#section-2.2.3>
 * - <https://en.wikipedia.org/wiki/X.690#BER_encoding>
 */
export function extractSignature(
    response: AuthenticatorAssertionResponse
): [bigint, bigint] {
    const check = (x: boolean): void => {
        if (!x) {
            throw new Error("invalid signature encoding");
        }
    };

    // Decode the DER signature. Note that we assume that all lengths fit into 8-bit integers,
    // which is true for the kinds of signatures we are decoding but generally false. I.e. this
    // code should not be used in any serious application.
    const view = new DataView(response.signature);

    // check that the sequence header is valid
    check(view.getUint8(0) === 0x30);
    check(view.getUint8(1) === view.byteLength - 2);

    // read r and s
    const readInt = (offset: number) => {
        check(view.getUint8(offset) === 0x02);
        const len = view.getUint8(offset + 1);
        const start = offset + 2;
        const end = start + len;
        const n = BigInt(toHex(new Uint8Array(view.buffer.slice(start, end))));
        check(n < maxUint256);
        return [n, end] as const;
    };
    const [r, sOffset] = readInt(2);
    const [s] = readInt(sOffset);

    return [r, s];
}
