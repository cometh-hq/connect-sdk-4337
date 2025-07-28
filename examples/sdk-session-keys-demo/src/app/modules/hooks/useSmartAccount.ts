"use client";

import { ENTRYPOINT_ADDRESS_V07 } from "@cometh/connect-core-sdk";
import {
    RHINESTONE_ATTESTER_ADDRESS,
    getSmartSessionsValidator,
} from "@rhinestone/module-sdk";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { useState } from "react";
import { http, type Hex, type PublicClient, createPublicClient } from "viem";
import { createPaymasterClient } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
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

            const signer = privateKeyToAccount(
                process.env.NEXT_PUBLIC_PRIVATE_KEY as Hex
            );

            const smartSessions = getSmartSessionsValidator({});

            let smartAccount;

            if (localStorageAddress) {
                smartAccount = await toSafeSmartAccount({
                    client: publicClient,
                    owners: [signer],
                    version: "1.4.1",
                    entryPoint: {
                        address: ENTRYPOINT_ADDRESS_V07,
                        version: "0.7",
                    },
                    safe4337ModuleAddress:
                        "0x7579EE8307284F293B1927136486880611F20002",
                    erc7579LaunchpadAddress:
                        "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                    attesters: [
                        RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
                    ],
                    attestersThreshold: 1,
                    validators: [
                        {
                            address: smartSessions.address,
                            context: smartSessions.initData,
                        },
                    ],
                    address: localStorageAddress,
                });

                // smartAccount = await createSafeSmartAccount({
                //     signer,
                //     smartAccountAddress: localStorageAddress,
                //     chain: arbitrumSepolia,
                //     publicClient,
                // })
            } else {
                smartAccount = await toSafeSmartAccount({
                    client: publicClient,
                    owners: [signer],
                    version: "1.4.1",
                    entryPoint: {
                        address: ENTRYPOINT_ADDRESS_V07,
                        version: "0.7",
                    },
                    safe4337ModuleAddress:
                        "0x7579EE8307284F293B1927136486880611F20002",
                    erc7579LaunchpadAddress:
                        "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                    attesters: [
                        RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
                    ],
                    attestersThreshold: 1,
                    validators: [
                        {
                            address: smartSessions.address,
                            context: smartSessions.initData,
                        },
                    ],
                });
                // smartAccount = await createSafeSmartAccount({
                //     signer,
                //     chain: arbitrumSepolia,
                //     publicClient,
                // })

                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            console.log("smartAccount", smartAccount.address);

            const paymasterClient = await createPaymasterClient({
                transport: http(paymasterUrl),
            });

            const pimlicoClient = createPimlicoClient({
                transport: http(paymasterUrl),
                entryPoint: {
                    address: ENTRYPOINT_ADDRESS_V07,
                    version: "0.7",
                },
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
                        return (await pimlicoClient.getUserOperationGasPrice())
                            .fast;
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
