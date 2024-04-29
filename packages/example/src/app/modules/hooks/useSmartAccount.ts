"use client";


import { useState } from "react";
import { http, type Hex } from "viem";
import { ENTRYPOINT_ADDRESS_V06, createComethPaymasterClient, createModularSmartAccount, createSmartAccountClient } from "@cometh/connect-sdk-4337";
import { arbitrumSepolia } from "viem/chains";


export function useSmartAccount() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [account, setAccount] = useState<any | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
  const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;

  function displayError(message: string) {
    setConnectionError(message);
  }

  async function connect() {
    if (!apiKey) throw new Error("API key not found");
    if (!bundlerUrl) throw new Error("Bundler Url not found");


    setIsConnecting(true);
    try {
        const localStorageAddress = window.localStorage.getItem(
            "walletAddress"
          ) as Hex;
    
          let smartAccount;
    
          if (localStorageAddress) {
            smartAccount = await createModularSmartAccount({
              apiKey,
              rpcUrl: "https://arb-sepolia.g.alchemy.com/v2/1I1l-3BakFdYZi3nguZrWu6etwg3KhVY",
              smartAccountAddress: localStorageAddress,
              entryPoint: ENTRYPOINT_ADDRESS_V06,
            });
          } else {
            smartAccount = await createModularSmartAccount({
              apiKey,
              rpcUrl: "https://arb-sepolia.g.alchemy.com/v2/1I1l-3BakFdYZi3nguZrWu6etwg3KhVY",
              entryPoint: ENTRYPOINT_ADDRESS_V06,
            });
            window.localStorage.setItem("walletAddress", smartAccount.address);
          }
      
          const paymasterClient = await createComethPaymasterClient({apiKey, bundlerUrl})
    
    
        const smartAccountClient = createSmartAccountClient({
            account: smartAccount,
            entryPoint: ENTRYPOINT_ADDRESS_V06,
            chain: arbitrumSepolia,
            bundlerTransport: http(bundlerUrl),
            middleware: {
              sponsorUserOperation: paymasterClient.sponsorUserOperation,
              gasPrice: paymasterClient.gasPrice,
          }
          })

      setAccount(smartAccountClient);
      setIsConnected(true);

    } catch (e) {
      displayError((e as Error).message);
    } finally {
      setIsConnecting(false);
    }
  }

  return {
    account,
    connect,
    isConnected,
    isConnecting,
    connectionError,
    setConnectionError,
  };
}
