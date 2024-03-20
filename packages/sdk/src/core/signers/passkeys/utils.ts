import { ethers } from "ethers";
import psl from "psl";

import { webAuthnOptions } from "../../wallet/types";

/**
 * Compute the additional client data JSON fields. This is the fields other than `type` and
 * `challenge` (including `origin` and any other additional client data fields that may be
 * added by the authenticator).
 *
 * See <https://w3c.github.io/webauthn/#clientdatajson-serialization>
 */
function extractClientDataFields(
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
  return ethers.hexlify(ethers.toUtf8Bytes(fields));
}

/**
 * Extracts the signature into R and S values from the authenticator response.
 *
 * See:
 * - <https://datatracker.ietf.org/doc/html/rfc3279#section-2.2.3>
 * - <https://en.wikipedia.org/wiki/X.690#BER_encoding>
 */
function extractSignature(
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
  const readInt = (offset: number): any => {
    check(view.getUint8(offset) === 0x02);
    const len = view.getUint8(offset + 1);
    const start = offset + 2;
    const end = start + len;
    const n = BigInt(
      ethers.hexlify(new Uint8Array(view.buffer.slice(start, end)))
    );
    check(n < ethers.MaxUint256);
    return [n, end] as const;
  };
  const [r, sOffset] = readInt(2);
  const [s] = readInt(sOffset);

  return [r, s];
}

const buildSignatureBytes = (signatures: any[]): string => {
  const SIGNATURE_LENGTH_BYTES = 65;
  signatures.sort((left, right) =>
    left.signer.toLowerCase().localeCompare(right.signer.toLowerCase())
  );

  let signatureBytes = "0x";
  let dynamicBytes = "";
  for (const sig of signatures) {
    if (sig.dynamic) {
      /* 
              A contract signature has a static part of 65 bytes and the dynamic part that needs to be appended 
              at the end of signature bytes.
              The signature format is
              Signature type == 0
              Constant part: 65 bytes
              {32-bytes signature verifier}{32-bytes dynamic data position}{1-byte signature type}
              Dynamic part (solidity bytes): 32 bytes + signature data length
              {32-bytes signature length}{bytes signature data}
          */
      const dynamicPartPosition = (
        signatures.length * SIGNATURE_LENGTH_BYTES +
        dynamicBytes.length / 2
      )
        .toString(16)
        .padStart(64, "0");
      const dynamicPartLength = (sig.data.slice(2).length / 2)
        .toString(16)
        .padStart(64, "0");
      const staticSignature = `${sig.signer
        .slice(2)
        .padStart(64, "0")}${dynamicPartPosition}00`;
      const dynamicPartWithLength = `${dynamicPartLength}${sig.data.slice(2)}`;

      signatureBytes += staticSignature;
      dynamicBytes += dynamicPartWithLength;
    } else {
      signatureBytes += sig.data.slice(2);
    }
  }

  return signatureBytes + dynamicBytes;
};

const getPasskeyCreationRpId = (): any => {
  return psl.parse(window.location.host).domain
    ? {
        name: psl.parse(window.location.host).domain,
        id: psl.parse(window.location.host).domain,
      }
    : { name: "localhost" };
};

const isWebAuthnCompatible = async (
  webAuthnOptions: webAuthnOptions
): Promise<boolean> => {
  try {
    if (!window.PublicKeyCredential) return false;

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

export {
  buildSignatureBytes,
  extractClientDataFields,
  extractSignature,
  getPasskeyCreationRpId,
  isWebAuthnCompatible,
};
