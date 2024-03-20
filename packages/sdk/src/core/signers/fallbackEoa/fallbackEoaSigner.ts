import {
  type Address,
  generatePrivateKey,
  privateKeyToAccount,
} from "viem/accounts";

import type { PrivateKeyAccount } from "viem";
import { getSignerLocalStorage } from "./services/eoaFallbackService";

const throwErrorWhenEoaFallbackDisabled = (
  disableEoaFallback: boolean
): void => {
  if (disableEoaFallback)
    throw new Error("Passkeys are not compatible with your device");
};

export const getExistingSigner = async ({
  walletAddress,
  disableEoaFallback,
  encryptionSalt,
}: {
  walletAddress: Address;
  disableEoaFallback: boolean;
  encryptionSalt?: string;
}): Promise<{ privateKey: `0x${string}`; signer: PrivateKeyAccount }> => {
  throwErrorWhenEoaFallbackDisabled(disableEoaFallback);

  const privateKey = await getSignerLocalStorage(walletAddress, encryptionSalt);

  if (!privateKey) throw new Error("no account found");

  return { privateKey, signer: privateKeyToAccount(privateKey) };
};

export const createNewSigner = async ({
  disableEoaFallback,
}: {
  disableEoaFallback: boolean;
}): Promise<{ privateKey: `0x${string}`; signer: PrivateKeyAccount }> => {
  throwErrorWhenEoaFallbackDisabled(disableEoaFallback);

  const privateKey = generatePrivateKey();
  const signer = privateKeyToAccount(privateKey);

  return { signer, privateKey };
};
