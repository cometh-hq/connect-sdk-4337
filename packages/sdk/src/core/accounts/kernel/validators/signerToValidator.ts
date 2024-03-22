import { type Chain, type Client, type Transport } from "viem";

import type { KernelValidator } from "@zerodev/sdk/types";

import { signerToEcdsaValidator } from "./ecdsa/signerToEcdsaValidator.js";
import { ENTRYPOINT_ADDRESS_V06 } from "../../../../config.js";

import type { ComethSigner } from "../../../signers/createSigner.js";
import { signerToWebAuthnValidator } from "./webauthn/signerToWebAuthnValidator.js";

type SignerToValidatorParams = {
  comethSigner: ComethSigner;
};

export async function signerToKernelValidator<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>(
  client: Client<TTransport, TChain, undefined>,
  { comethSigner }: SignerToValidatorParams
): Promise<KernelValidator> {
  let validator: KernelValidator;

  if (comethSigner.type === "localWallet") {
    validator = await signerToEcdsaValidator(client, {
      signer: comethSigner.eoaFallback.signer,
      entryPoint: ENTRYPOINT_ADDRESS_V06,
    });
  } else {
    validator = await signerToWebAuthnValidator(client, {
      passkey: comethSigner.passkey,
      entryPoint: ENTRYPOINT_ADDRESS_V06,
    });
  }

  if (!validator) {
    throw new Error("A validator must be set");
  }

  return {
    ...validator,
  };
}
