import type { Hex } from "viem";

type Assertion = {
  rawId: ArrayBuffer;
  response: AuthenticatorAssertionResponse;
};

type PasskeyCredential = {
  id: "string";
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
    getPublicKey(): ArrayBuffer;
    getPublicKeyAlgorithm(): any;
  };
  type: "public-key";
};

type PasskeyCredentialWithPubkeyCoordinates = PasskeyCredential & {
  pubkeyCoordinates: {
    x: string;
    y: string;
  };
};

type PasskeyCredentials = Readonly<{
  publicKeyId: Hex;
  publicKeyX: Hex;
  publicKeyY: Hex;
}>;

export type {
  Assertion,
  PasskeyCredential,
  PasskeyCredentials,
  PasskeyCredentialWithPubkeyCoordinates,
};
