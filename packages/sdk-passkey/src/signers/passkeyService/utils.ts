import { maxUint256, toBytes, toHex } from "viem";

import {
    ChallengeNotFoundError,
    InvalidSignatureEncodingError,
} from "@/errors";
import type { webAuthnOptions } from "./types";

export const DEFAULT_WEBAUTHN_OPTIONS: webAuthnOptions = {
    // authenticatorSelection documentation can be found here: https://www.w3.org/TR/webauthn-2/#dictdef-authenticatorselectioncriteria
    authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
    },
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
        throw new ChallengeNotFoundError();
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
    signature: ArrayBuffer | Uint8Array
): [bigint, bigint] {
    const check = (x: boolean): void => {
        if (!x) {
            throw new InvalidSignatureEncodingError();
        }
    };

    // Convert Uint8Array to ArrayBuffer if needed
    const buffer =
        signature instanceof Uint8Array ? signature.buffer : signature;
    const view = new DataView(buffer);

    // check that the sequence header is valid
    check(view.getUint8(0) === 0x30);
    check(view.getUint8(1) === view.byteLength - 2);

    // read r and s
    const readInt = (offset: number) => {
        check(view.getUint8(offset) === 0x02);
        const len = view.getUint8(offset + 1);
        const start = offset + 2;
        const end = start + len;
        const n = BigInt(toHex(new Uint8Array(buffer.slice(start, end))));
        check(n < maxUint256);
        return [n, end] as const;
    };
    const [r, sOffset] = readInt(2);
    const [s] = readInt(sOffset);

    return [r, s];
}
