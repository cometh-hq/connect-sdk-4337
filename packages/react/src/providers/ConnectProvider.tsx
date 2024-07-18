import type { QueryClient } from "@tanstack/react-query";
import type {
  ENTRYPOINT_ADDRESS_V07_TYPE,
  EntryPoint,
} from "permissionless/types/entrypoint";
import React, {
  type ReactNode,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { http } from "wagmi";

import {
  type ComethSmartAccountClient,
  ENTRYPOINT_ADDRESS_V07,
  type SafeSmartAccount,
  createComethPaymasterClient,
  createSafeSmartAccount,
  type createSafeSmartAccountParameters,
  createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import type { Chain, Hex, Transport } from "viem";
import { arbitrumSepolia } from "viem/chains";

type ContextComethSmartAccountClient = ComethSmartAccountClient<
  SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
  Transport,
  Chain,
  ENTRYPOINT_ADDRESS_V07_TYPE
>;

export type ConnectProviderProps<
  TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE
> = {
  children: ReactNode;
  config: Partial<createSafeSmartAccountParameters<TEntryPoint>> & {
    paymasterUrl: string;
    bundlerUrl: string;
  };
  queryClient: QueryClient | undefined;
};

export type ConnectContextPayload<
  TSmartAccount extends SafeSmartAccount<TEntryPoint, Transport, Chain>,
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
  TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE
> = {
  smartAccountClient: ComethSmartAccountClient<
    TSmartAccount,
    TTransport,
    TChain,
    TEntryPoint
  > | null;
  queryClient: QueryClient | undefined;
  smartAccountAddress: Hex;
  bundlerUrl: string;
  apiKey: string;
};

/** @ignore */
export const ConnectContext = createContext<
  ConnectContextPayload<
    SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
    Transport,
    Chain,
    ENTRYPOINT_ADDRESS_V07_TYPE
  >
>({
  smartAccountClient: null,
  queryClient: undefined,
  smartAccountAddress: "0x" as Hex,
  bundlerUrl: "",
  apiKey: "",
});

export const ConnectProvider = <
  TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE
>(
  props: ConnectProviderProps<TEntryPoint>
) => {
  const { children, config, queryClient } = props;
  const {
    bundlerUrl,
    paymasterUrl,
    apiKey,
    rpcUrl,
    baseUrl,
    comethSignerConfig,
    safeContractConfig,
  } = config;

  const chain = arbitrumSepolia;
  const [smartAccountClient, setSmartAccountClient] =
    useState<ContextComethSmartAccountClient | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<Hex>(
    "0x" as Hex
  );

  useEffect(() => {
    const createSmartAccount = async () => {
      if (!smartAccountClient) {
        const account = await createSafeSmartAccount({
          apiKey: apiKey as string,
          rpcUrl,
          baseUrl,
          smartAccountAddress,
          entryPoint: ENTRYPOINT_ADDRESS_V07,
          comethSignerConfig,
          safeContractConfig,
        });

        let client: ContextComethSmartAccountClient;

        if (paymasterUrl) {
          const paymasterClient = await createComethPaymasterClient({
            transport: http(paymasterUrl),
            chain,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            rpcUrl,
          });

          client = createSmartAccountClient({
            account: account as SafeSmartAccount<
              ENTRYPOINT_ADDRESS_V07_TYPE,
              Transport,
              Chain
            >,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain,
            bundlerTransport: http(bundlerUrl),
            middleware: {
              sponsorUserOperation: paymasterClient.sponsorUserOperation,
              gasPrice: paymasterClient.gasPrice,
            },
            rpcUrl,
          }) as ContextComethSmartAccountClient;
        } else {
          client = createSmartAccountClient({
            account: account as SafeSmartAccount<
              ENTRYPOINT_ADDRESS_V07_TYPE,
              Transport,
              Chain
            >,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain,
            bundlerTransport: http(bundlerUrl),
            rpcUrl,
          }) as ContextComethSmartAccountClient;
        }
        setSmartAccountClient(client);
        setSmartAccountAddress(await client.account.address);
      }
    };

    createSmartAccount();
  }, [
    bundlerUrl,
    smartAccountClient,
    apiKey,
    rpcUrl,
    baseUrl,
    comethSignerConfig,
    safeContractConfig,
    paymasterUrl,
  ]);

  const value = useMemo(
    (): ConnectContextPayload<
      SafeSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE, Transport, Chain>,
      Transport,
      Chain,
      ENTRYPOINT_ADDRESS_V07_TYPE
    > => ({
      smartAccountClient,
      queryClient,
      smartAccountAddress,
      bundlerUrl,
      apiKey: apiKey as string,
    }),
    [smartAccountClient, queryClient, smartAccountAddress, bundlerUrl, apiKey]
  );

  return (
    <ConnectContext.Provider value={value}>{children}</ConnectContext.Provider>
  );
};
