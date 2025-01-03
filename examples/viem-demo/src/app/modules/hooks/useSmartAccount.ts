"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import { useState } from "react";
import { http, type Hex, createPublicClient } from "viem";
import { gnosis } from "viem/chains";

export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;
    //const baseUrl = "https://api.4337.develop.core.cometh.tech";
    const rpcUrl = undefined;

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

            const publicClient = createPublicClient({
                chain: gnosis,
                transport: http(),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            });

            let smartAccount;

            const comethSignerConfig = {
                fullDomainSelected: true,
                passKeyName: "oiqvefor",
            };

            if (localStorageAddress) {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: gnosis,
                    publicClient,
                    smartAccountAddress: localStorageAddress,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    comethSignerConfig,

                });
            } else {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: gnosis,
                    publicClient,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    comethSignerConfig,

                });
                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: gnosis,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                publicClient,
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                chain: gnosis,
                bundlerTransport: http(bundlerUrl, {
                    retryCount: 5,
                    retryDelay: 1000,
                    timeout: 20_000,
                }),
                middleware: {
                    sponsorUserOperation: paymasterClient.sponsorUserOperation,
                    gasPrice: paymasterClient.gasPrice,
                },
                publicClient
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
