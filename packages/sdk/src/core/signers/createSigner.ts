import { type Address } from "viem/accounts";

import type { Chain, Client, PrivateKeyAccount, Transport } from "viem";
import { encryptSignerInStorage } from "./fallback/services/eoaFallbackService";
import type { ENTRYPOINT_ADDRESS_V06_TYPE } from "permissionless/types/entrypoint";
import { KERNEL_ADDRESSES } from "../../config";
import {
  getAccountAddress,
  getAccountInitCode,
} from "../accounts/kernel/createKernelAccount";
import type { API } from "../services/API";
import { createNewSigner, getExistingSigner } from "./fallback/fallbackSigner";

/**
 * Helper to ease the build of an account
 * @param walletAddress
 * @param disableEoaFallback
 * @param encryptionSalt
 */
export async function createSigner<
  entryPoint extends ENTRYPOINT_ADDRESS_V06_TYPE,
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined
>({
  client,
  api,
  walletAddress,
  disableEoaFallback,
  encryptionSalt,
  entryPoint: entryPointAddress,
  factoryAddress = KERNEL_ADDRESSES.FACTORY_ADDRESS,
  accountLogicAddress = KERNEL_ADDRESSES.ACCOUNT_LOGIC,
  validatorAddress = KERNEL_ADDRESSES.ECDSA_VALIDATOR,
  deployedAccountAddress,
}: {
  client: Client<TTransport, TChain>;
  api: API;
  walletAddress?: Address;
  disableEoaFallback: boolean;
  encryptionSalt?: string;
  entryPoint: entryPoint;
  factoryAddress?: Address;
  accountLogicAddress?: Address;
  validatorAddress?: Address;
  deployedAccountAddress?: Address;
}): Promise<PrivateKeyAccount> {
  let privateKey: `0x${string}`;
  let signer: PrivateKeyAccount;

  if (!walletAddress) {
    ({ privateKey, signer } = await createNewSigner({
      api,
      disableEoaFallback,
    }));

    const generateInitCode = () =>
      getAccountInitCode({
        owner: signer.address,
        index: 0n,
        accountLogicAddress,
        validatorAddress,
      });

    walletAddress = await getAccountAddress<entryPoint, TTransport, TChain>({
      client,
      entryPoint: entryPointAddress,
      owner: signer.address,
      validatorAddress,
      initCodeProvider: generateInitCode,
      deployedAccountAddress,
      factoryAddress,
    });
  } else {
    ({ privateKey, signer } = await getExistingSigner({
      walletAddress,
      disableEoaFallback,
      encryptionSalt,
    }));
  }

  await encryptSignerInStorage(walletAddress, privateKey, encryptionSalt);

  return signer;
}
