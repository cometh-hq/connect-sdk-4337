import { type Chain, type Client, type Transport } from "viem";

import type { KernelValidator } from "@zerodev/sdk/types";

import { signerToEcdsaValidator } from "./ecdsa/signerToEcdsaValidator.js";
import { ENTRYPOINT_ADDRESS_V06 } from "../../../../config.js";
import type { SmartAccountSigner } from "permissionless/accounts/types.js";

type SignerToValidatorParams = {
  signer: SmartAccountSigner;
};

export async function signerToKernelValidator<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>(
  client: Client<TTransport, TChain, undefined>,
  { signer }: SignerToValidatorParams
): Promise<KernelValidator> {
  const validator = await signerToEcdsaValidator(client, {
    signer,
    entryPoint: ENTRYPOINT_ADDRESS_V06,
  });

  if (!validator) {
    throw new Error("A validator must be set");
  }

  return {
    ...validator,
  };
}
