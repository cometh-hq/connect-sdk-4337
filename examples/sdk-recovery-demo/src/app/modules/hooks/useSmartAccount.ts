"use client";

import {
    createComethPaymasterClient,
    createSafeSmartAccount,
    //createSmartAccountClient,
} from "@cometh/connect-core-sdk";
import { recoveryActions } from "@cometh/recovery"
import { useState } from "react";
import { http, type Hex, type PublicClient, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

import { toSafeSmartAccount } from 'permissionless/accounts'
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";

export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
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

            const publicClient = createPublicClient({
                chain: arbitrumSepolia,
                transport: http(),
                cacheTime: 60_000,
                batch: {
                    multicall: { wait: 50 },
                },
            }) as PublicClient;

            const ownerPK = process.env.NEXT_PUBLIC_PRIVATE_KEY;

            const owner = privateKeyToAccount(ownerPK as Hex);

            let smartAccount;

            if (localStorageAddress) {
                // smartAccount = await createSafeSmartAccount({
                //     chain: arbitrumSepolia,
                //     publicClient,
                //     signer: owner,
                //     smartAccountAddress: localStorageAddress,
                // });

                smartAccount = await toSafeSmartAccount({
                    client: publicClient,
                    owners: [owner],
                    version: "1.4.1",
                    entryPoint: {
                        address: entryPoint07Address,
                        version: "0.7",
                    },
                    address: localStorageAddress,
                });

            } else {
                // smartAccount = await createSafeSmartAccount({
                //     chain: arbitrumSepolia,
                //     signer: owner,
                //     publicClient,
                // });

                smartAccount = await toSafeSmartAccount({
                    client: publicClient,
                    owners: [owner],
                    version: "1.4.1",
                    entryPoint: {
                        address: entryPoint07Address,
                        version: "0.7",
                    },
                });


                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

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
            }).extend(recoveryActions());

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
