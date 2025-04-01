"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-sdk-lite";
import { useState } from "react";
import { http, type Hex, type PublicClient, createPublicClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

    function displayError(message: string) {
        setConnectionError(message);
    }

    async function connect() {
        if (!bundlerUrl) throw new Error("Bundler Url not found");

        setIsConnecting(true);
        try {


            const publicClient = createPublicClient({
                chain: arbitrumSepolia,
                transport: http(),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            }) as PublicClient;

            const signer = privateKeyToAccount(process.env.NEXT_PUBLIC_PRIVATE_KEY!);

            const smartAccount = await createSafeSmartAccount({
                    chain: arbitrumSepolia,
                    publicClient,
                    signer
                });

            const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: arbitrumSepolia,
                publicClient,
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                chain: arbitrumSepolia,
                bundlerTransport: http(bundlerUrl, {
                    retryCount: 5,
                    retryDelay: 1000,
                    timeout: 20_000,
                }),
                paymaster: paymasterClient,
                userOperation: {
                    estimateFeesPerGas: async () => {
                        return await paymasterClient.getUserOperationGasPrice();
                    },
                },
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
