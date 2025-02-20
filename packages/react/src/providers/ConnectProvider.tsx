import { createSmartAccount } from "@/actions/createSmartAccount";
import { BundlerUrlNotFoundError } from "@/errors";
import type { ConnectParameters } from "@/hooks/useConnect";
import type {
  ComethSafeSmartAccount,
  ComethSmartAccountClient,
  createSafeSmartAccountParameters,
} from "@cometh/connect-sdk-4337";
import type { QueryClient } from "@tanstack/react-query";
import React, {
  type ReactNode,
  createContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Address, Chain, PublicClient, Transport } from "viem";

const CHAIN_STORAGE_KEY = "currentChain";

export type NetworkParams = {
  chain?: Chain;
  bundlerUrl?: string;
  paymasterUrl?: string;
  publicClient?: PublicClient;
};

type OmitConfig<T> = Omit<
  T,
  "chain" | "paymasterUrl" | "bundlerUrl" | "publicClient"
> & {
  networksConfig: NetworkParams[];
};

type ConnectConfig = OmitConfig<createSafeSmartAccountParameters>;

export type ContextComethSmartAccountClient = ComethSmartAccountClient<
  Transport,
  Chain,
  ComethSafeSmartAccount
>;

export type UpdateClientPayload = ConnectParameters & { chain?: Chain };

export type ConnectContextPayload = {
  queryClient?: QueryClient;
  smartAccountClient: ContextComethSmartAccountClient | null;
  smartAccountAddress: Address | undefined;
  updateSmartAccountClient: (params?: UpdateClientPayload) => Promise<void>;
  disconnectSmartAccount: () => Promise<void>;
  networksConfig: NetworkParams[] | undefined;
  apikey?: string;
};

export const ConnectContext = createContext<ConnectContextPayload>({
  queryClient: undefined,
  smartAccountClient: null,
  smartAccountAddress: undefined,
  updateSmartAccountClient: async () => {},
  disconnectSmartAccount: async () => {},
  networksConfig: undefined,
  apikey: undefined,
});

export const ConnectProvider = <
  TConfig extends ConnectConfig,
  TQueryClient extends QueryClient | undefined
>({
  children,
  config,
  queryClient,
}: {
  children: ReactNode;
  config: TConfig;
  queryClient: TQueryClient;
}) => {
  const [smartAccountClient, setSmartAccountClient] =
    useState<ContextComethSmartAccountClient | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    Address | undefined
  >(undefined);

  const updateSmartAccountClient = useCallback(
    async (params: UpdateClientPayload = {}) => {
      const chain: Chain =
        params.chain ??
        JSON.parse(localStorage.getItem(CHAIN_STORAGE_KEY) ?? "null") ??
        config.networksConfig[0].chain;

      const bundlerUrl = config.networksConfig.find(
        (network) => network.chain?.id === chain.id
      )?.bundlerUrl;
      const paymasterUrl = config.networksConfig.find(
        (network) => network.chain?.id === chain.id
      )?.paymasterUrl;
      const publicClient = config.networksConfig.find(
        (network) => network.chain?.id === chain.id
      )?.publicClient;

      if (!bundlerUrl) throw new BundlerUrlNotFoundError();

      try {
        const { client, address: newAddress } = await createSmartAccount({
          ...config,
          chain,
          bundlerUrl,
          paymasterUrl,
          publicClient,
          smartAccountAddress: params.address,
          comethSignerConfig: {
            ...config.comethSignerConfig,
            passKeyName: params.passKeyName,
          },
        });

        setSmartAccountClient(client);
        setSmartAccountAddress(newAddress);

        localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(chain));
      } catch (e) {
        console.log(e);
      }
    },
    [config, config.networksConfig[0].chain]
  );

  const disconnectSmartAccount = useCallback(async () => {
    setSmartAccountClient(null);
    setSmartAccountAddress(undefined);
    localStorage.removeItem(CHAIN_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (config.smartAccountAddress) {
      updateSmartAccountClient({ address: config.smartAccountAddress });
    }
  }, [config.smartAccountAddress, updateSmartAccountClient]);

  const value = useMemo(
    (): ConnectContextPayload => ({
      queryClient,
      smartAccountClient,
      smartAccountAddress,
      updateSmartAccountClient,
      disconnectSmartAccount,
      networksConfig: config.networksConfig,
      apikey: config.apiKey,
    }),
    [
      queryClient,
      smartAccountClient,
      smartAccountAddress,
      updateSmartAccountClient,
      disconnectSmartAccount,
      config.networksConfig,
    ]
  );

  return (
    <ConnectContext.Provider value={value}>{children}</ConnectContext.Provider>
  );
};
