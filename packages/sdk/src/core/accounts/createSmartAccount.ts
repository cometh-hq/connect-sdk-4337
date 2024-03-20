import { signerToKernelSmartAccount } from "./kernel/createKernelAccount";
import { createClient, http } from "viem";
import type { Address, Chain } from "viem";

import type { ENTRYPOINT_ADDRESS_V06_TYPE } from "permissionless/types/entrypoint";
import { API } from "../services/API";
import {
  ENTRYPOINT_ADDRESS_V06,
  networks,
  supportedChains,
} from "../../config";
import { createSigner } from "../signers/createSigner";

export type WalletConfig = {
  apiKey: string;
  rpcUrl?: string;
  walletAddress?: Address;
  disableEoaFallback?: boolean;
  encryptionSalt?: string;
  entryPoint?: ENTRYPOINT_ADDRESS_V06_TYPE;
  factoryAddress?: Address;
  accountLogicAddress?: Address;
  validatorAddress?: Address;
  deployedAccountAddress?: Address;
};

const getNetwork = async (api: API): Promise<Chain> => {
  const chainId = await api.getProjectParams().then((params) => params.chainId);
  return supportedChains.find((chain) => chain.id === +chainId) as Chain;
};

const getViemClient = (chain: Chain, rpcUrl: string) => {
  const rpcTransport = http(rpcUrl, {
    batch: { wait: 50 },
    retryCount: 5,
    retryDelay: 200,
    timeout: 20_000,
  });

  return createClient({
    chain,
    transport: rpcTransport,
    cacheTime: 60_000,
    batch: {
      multicall: { wait: 50 },
    },
  });
};

/**
 * Helper to ease the build of a webauthn smart wallet
 * @param walletAddress
 * @param disableEoaFallback
 */
export async function createSmartAccount({
  apiKey,
  rpcUrl,
  walletAddress,
  disableEoaFallback = false,
  encryptionSalt,
  entryPoint = ENTRYPOINT_ADDRESS_V06,
}: WalletConfig) {
  const api = new API(apiKey);
  const chain = await getNetwork(api);
  const client = getViemClient(chain, rpcUrl || networks[chain.id].rpcUrl);

  if (walletAddress) {
    const storedWallet = api.getWalletInfos(walletAddress);
    if (!storedWallet) throw new Error("Wallet not found");
  }

  const signer = await createSigner({
    client,
    api,
    walletAddress,
    disableEoaFallback,
    encryptionSalt,
    entryPoint,
  });

  return await signerToKernelSmartAccount(client, {
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    signer,
  });
}
