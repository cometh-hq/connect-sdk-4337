"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import { useState } from "react";
import { http, type Hex, createPublicClient, parseEther } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { arbitrumSepolia } from "viem/chains";

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
            });

            let smartAccount;

            const comethSignerConfig = {
                fullDomainSelected: true,
                passKeyName: "oiqvefor",
            };

            if (localStorageAddress) {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: arbitrumSepolia,
                    publicClient,
                    smartAccountAddress: localStorageAddress,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    comethSignerConfig,
                });
            } else {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: arbitrumSepolia,
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
                publicClient,
            });

            console.log("yo")

            const bundlerClient = createBundlerClient({
                account: smartAccount,
                client: smartAccountClient,
                transport: http(smartAccountClient.transport.url)
            })

            console.log({ bundlerClient })

            try {
                const test = await bundlerClient.estimateUserOperationGas({
                    calls: [
                        {
                            to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
                            value: parseEther("0"),
                            data: "0x00"
                        }
                    ],
                });
                console.log({ test })

            } catch (e) {
                console.log(e)
            }




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
