"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import { useState } from "react";
import { http, type Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";

export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

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

            const baseUrl = "http://127.0.0.1:8000/connect";

            if (localStorageAddress) {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    rpcUrl: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
                    baseUrl,
                    smartAccountAddress: localStorageAddress,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                });
            } else {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    rpcUrl: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
                    baseUrl,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                });
                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: arbitrumSepolia,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                rpcUrl: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                chain: arbitrumSepolia,
                bundlerTransport: http(bundlerUrl),
                middleware: {
                    sponsorUserOperation: paymasterClient.sponsorUserOperation,
                    gasPrice: paymasterClient.gasPrice,
                },
                rpcUrl: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
            });

           /*  await smartAccountClient.addOwner({
                ownerToAdd: "0x53011E110CAd8685F4911508B4E2413f526Df73E",
            }); */

            const recoveryDetails = await smartAccountClient.isRecoveryActive({ rpcUrl: "https://arbitrum-sepolia.blockpi.network/v1/rpc/public"});

            const owners = await smartAccountClient.getOwners();

            const enrichedOwners = await smartAccountClient.getEnrichedOwners();

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
