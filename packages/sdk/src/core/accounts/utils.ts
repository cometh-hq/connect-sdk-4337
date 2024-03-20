import { http, type Chain, createClient } from "viem";
import type { API } from "../services/API";
import { supportedChains } from "../../config";

export const getNetwork = async (api: API): Promise<Chain> => {
  const chainId = await api.getProjectParams().then((params) => params.chainId);
  return supportedChains.find((chain) => chain.id === +chainId) as Chain;
};

export const getViemClient = (chain: Chain, rpcUrl: string) => {
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
