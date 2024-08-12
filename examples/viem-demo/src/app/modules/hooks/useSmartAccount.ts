"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import { useState } from "react";
import { http, type Hex } from "viem";
import { arbitrumSepolia, polygon } from "viem/chains";

export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;
    const baseUrl = "http://127.0.0.1:8000/connect";
    const rpcUrl = undefined;
    const sessionKeysEnabled = false;

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

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

            const comethSignerConfig = {
                fullDomainSelected: true,
                passKeyName: "oiqvefor",
            };

            if (localStorageAddress) {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: arbitrumSepolia,
                    rpcUrl,
                    baseUrl,
                    smartAccountAddress: localStorageAddress,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    comethSignerConfig,
                });
            } else {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: arbitrumSepolia,
                    rpcUrl,
                    baseUrl,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    comethSignerConfig,
                });
                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            console.log({ smartAccount });

            /* const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: polygon,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                rpcUrl,
            });

            console.log({paymasterClient}) */

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                chain: polygon,
                bundlerTransport: http(bundlerUrl),
                /*   middleware: {
                    sponsorUserOperation: paymasterClient.sponsorUserOperation,
                    gasPrice: paymasterClient.gasPrice,
                },
                rpcUrl,
            });

                }, */
                //rpcUrl: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
            });

            setSmartAccount(smartAccountClient);
            setIsConnected(true);
        } catch (e) {
            displayError((e as Error).message);
        } finally {
            setIsConnecting(false);
        }
    }

    return {
        smartAccount,
        connect,
        isConnected,
        isConnecting,
        connectionError,
        newSigner,
        setNewSigner,
        setConnectionError,
    };
}
