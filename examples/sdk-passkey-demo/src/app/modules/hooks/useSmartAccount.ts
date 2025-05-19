"use client";

import {
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-core-sdk";
import { passkeyActions, passkeySetupTx, toPasskeyAccount, toPasskeySigner } from "@cometh/passkeys";
import { isSmartAccountDeployed } from "permissionless";
import { useState } from "react";
import { http, type Hex, type PublicClient, createPublicClient, } from "viem";
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
            const localStorageAddress = window.localStorage.getItem(
                "walletAddress"
            ) as Hex;

            const publicClient = createPublicClient({
                chain: arbitrumSepolia,
                transport: http(),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            }) as PublicClient;

            const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
            if (!apiKey) throw new Error("API Key not found");

            let signer
            let smartAccount;
            let passkeyTx;

            if (localStorageAddress) {
                signer = await toPasskeySigner({
                    apiKey,
                    chain: arbitrumSepolia,
                    smartAccountAddress: localStorageAddress,
                });

                const isDeployed = await isSmartAccountDeployed(
                    publicClient,
                    localStorageAddress,
                );
            
                if (!isDeployed) {
                    passkeyTx = await passkeySetupTx({
                        passkeySigner: signer,
                        chain: arbitrumSepolia,
                        apiKey,
                    });
                }

                smartAccount = await createSafeSmartAccount({
                    chain: arbitrumSepolia,
                    publicClient,
                    smartAccountAddress: localStorageAddress,
                    signer,
                    setupTransactions: passkeyTx ? [passkeyTx] : [],
                });

            } else {

                signer = await toPasskeySigner({
                    apiKey,
                    chain: arbitrumSepolia,
                });


                passkeyTx = await passkeySetupTx({
                    passkeySigner: signer,
                    chain: arbitrumSepolia,
                    apiKey,
                });

                smartAccount = await createSafeSmartAccount({
                    chain: arbitrumSepolia,
                    publicClient,
                    signer,
                    setupTransactions: [passkeyTx],
                });

                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            const passkeyAccount = await toPasskeyAccount(
                smartAccount,
                signer,
            )

            const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: arbitrumSepolia,
                publicClient,
            });

            const smartAccountClient = createSmartAccountClient({
                account: passkeyAccount,
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
            }).extend(passkeyActions());

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
