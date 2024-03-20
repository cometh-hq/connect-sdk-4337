import { type Address } from "viem/accounts";

import type { Hex } from "viem";

import {
  createNewSigner,
  getExistingSigner,
} from "./fallbackEoa/fallbackEoaSigner";
import type { SmartAccountSigner } from "permissionless/accounts";

type eoaFallbackParams = {
  privateKey: Hex;
  encryptionSalt?: string;
};

export type ComethSigner = {
  signer: SmartAccountSigner;
  eoaFallbackParams?: eoaFallbackParams;
};

/**
 * Helper to create the Cometh Signer
 * @param address
 * @param disableEoaFallback
 * @param encryptionSalt
 */
export async function createSigner({
  address,
  disableEoaFallback = false,
  encryptionSalt,
}: {
  address?: Address;
  disableEoaFallback?: boolean;
  encryptionSalt?: string;
}): Promise<ComethSigner> {
  let privateKey: Hex;
  let signer: SmartAccountSigner;

  if (!address) {
    ({ privateKey, signer } = await createNewSigner({
      disableEoaFallback,
    }));
  } else {
    ({ privateKey, signer } = await getExistingSigner({
      walletAddress: address,
      disableEoaFallback,
      encryptionSalt,
    }));
  }

  return {
    signer,
    eoaFallbackParams: {
      privateKey,
      encryptionSalt,
    } as eoaFallbackParams,
  };
}
