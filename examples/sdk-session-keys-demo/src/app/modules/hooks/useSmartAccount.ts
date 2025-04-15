"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-core-sdk";
import { RHINESTONE_ATTESTER_ADDRESS } from "@rhinestone/module-sdk";
import { toSafeSmartAccount } from "permissionless/accounts";
import { useState } from "react";
import { http, type Hex, type PublicClient, createPublicClient } from "viem";
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


            let smartAccount;

            if (localStorageAddress) {
                // smartAccount = await toSafeSmartAccount({
                //     client: publicClient,
                //     owners: [signer],
                //     version: "1.4.1",
                //     entryPoint: {
                //         address: ENTRYPOINT_ADDRESS_V07,
                //         version: "0.7",
                //     },
                //     safeSingletonAddress: "0x29fcb43b46531bca003ddc8fcb67ffe91900c762",
                //     safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
                //     erc7579LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                //     safeProxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
                //     multisendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
                //     setUpContractAddress: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
                //     modules: ["0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226"],
                //     fallback: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
                //     attesters: [
                //         RHINESTONE_ATTESTER_ADDRESS,
                //         //"0xA4C777199658a41688E9488c4EcbD7a2925Cc23A", // Mock Attester - do not use in production
                //     ],
                //     attestersThreshold: 1,
                //     chain: arbitrumSepolia,
                //     saltNonce: BigInt(12),
                //     address: localStorageAddress,
                // })

                smartAccount = await createSafeSmartAccount({
                    signer,
                    smartAccountAddress: localStorageAddress,
                    chain: arbitrumSepolia,
                    publicClient,
                })
  
            } else {
                // smartAccount = await toSafeSmartAccount({
                //     client: publicClient,
                //     owners: [signer],
                //     version: "1.4.1",
                //     entryPoint: {
                //         address: ENTRYPOINT_ADDRESS_V07,
                //         version: "0.7",
                //     },
                //     safeSingletonAddress: "0x29fcb43b46531bca003ddc8fcb67ffe91900c762",
                //     safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
                //     erc7579LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                //     safeProxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
                //     multisendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
                //     setUpContractAddress: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
                //     modules: ["0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226"],
                //     fallback: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
                //     attesters: [
                //         RHINESTONE_ATTESTER_ADDRESS,
                //         //"0xA4C777199658a41688E9488c4EcbD7a2925Cc23A", // Mock Attester - do not use in production
                //     ],
                //     attestersThreshold: 1,
                //     chain: arbitrumSepolia,
                //     saltNonce: BigInt(12),
                // });

                smartAccount = await createSafeSmartAccount({
                    signer,
                    chain: arbitrumSepolia,
                    publicClient,
                })

                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            console.log("smartAccount", smartAccount.address);



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
