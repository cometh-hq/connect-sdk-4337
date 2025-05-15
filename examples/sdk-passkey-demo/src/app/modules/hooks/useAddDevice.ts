"use client";

import {
    createComethPaymasterClient,
    createSafeSmartAccount,
    // createSmartAccountClient,
    ENTRYPOINT_ADDRESS_V07,
} from "@cometh/connect-core-sdk";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createSmartAccountClient } from "permissionless";
import { createNewPasskeySigner, generateQRCodeUrl, passkeyActions, serializeUrlWithSignerPayload, toPasskeyAccount, toPasskeySigner } from "@cometh/passkeys";
import { useState } from "react";
import { http, type Hex, type PublicClient, createPublicClient } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

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

            if (localStorageAddress) {
                signer = await privateKeyToAccount(process.env.NEXT_PUBLIC_PRIVATE_KEY as Hex)

                // smartAccount = await createSafeSmartAccount({
                //     chain: arbitrumSepolia,
                //     publicClient,
                //     smartAccountAddress: localStorageAddress,
                //     signer
                // });

                smartAccount = await toSafeSmartAccount({
                    client: publicClient,
                    owners: [signer],
                    version: "1.4.1",
                    entryPoint: {
                        address: ENTRYPOINT_ADDRESS_V07,
                        version: "0.7",
                    },
                    address: localStorageAddress,
                });
            } else {
                signer = await privateKeyToAccount(process.env.NEXT_PUBLIC_PRIVATE_KEY as Hex)

                // smartAccount = await createSafeSmartAccount({
                //     chain: arbitrumSepolia,
                //     publicClient,
                //     signer,
                //    // setupTransactions: [passkeyTx],
                // });

                smartAccount = await toSafeSmartAccount({
                    client: publicClient,
                    owners: [signer],
                    version: "1.4.1",
                    entryPoint: {
                        address: ENTRYPOINT_ADDRESS_V07,
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
            }).extend(passkeyActions())


            // ######## add passkey owner #############

            const passkey = await createNewPasskeySigner({
                apiKey,
            });

            const validationPageUrl = "http://localhost:3006/add-device/validate-device"

            const qrCode = await generateQRCodeUrl(validationPageUrl, passkey)
            console.log("qrCode", qrCode)

            const validationUrl = await serializeUrlWithSignerPayload(validationPageUrl, passkey)
            console.log("validationUrl", validationUrl.href)



            const txHash = await smartAccountClient.addPasskeyOwner({
                passkeyObject: passkey,
                apiKey,
            })

            console.log("txHash", txHash)

            const passkeyAccount = await toPasskeyAccount(
                smartAccount,
                await toPasskeySigner({
                    apiKey,
                    chain: arbitrumSepolia,
                    smartAccountAddress: smartAccount.address,
                })
            )

            const passkeyClient = createSmartAccountClient({
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
            });

            // ##############################################

            setSmartAccount(passkeyClient);
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
