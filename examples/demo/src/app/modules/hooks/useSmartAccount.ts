"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-sdk-7579";
import { useState } from "react";
import { createWalletClient, hexToBigInt, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia, baseSepolia } from "viem/chains";



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

            console.log({localStorageAddress})

            let smartAccount;

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

            const sharedWebauthnSigner = "0xfD90FAd33ee8b58f32c00aceEad1358e4AFC23f9"
            const webauthnVerifer = "0x445a0683e494ea0c5AF3E83c5159fBE47Cf9e765"

            const comethSigner = {
                id: "0x9e5215bd068221aaf3acebc938cf918bf95d526b",
                pubkeyCoordinates: {
                    x: "0xadd859650ef78cc9c920bd146d1f3acfccb44e2b8ea5194b2aed7dd56e76dba6",
                    y: "0xb7fd618e516d19a5a2c1468fc2f4c9cb446ae8613f6b6ec5bb858a62158c93be"
                },
                signerAddress: "0xfD90FAd33ee8b58f32c00aceEad1358e4AFC23f9"
            }

            const privateKey = process.env.NEXT_PUBLIC_PK! as Hex;
            const signer = privateKeyToAccount(privateKey);

            const walletClient = createWalletClient({ 
                account: signer, 
                chain: arbitrumSepolia,
                transport: http()
            })
         
        

            if (localStorageAddress) {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain:baseSepolia,
                    baseUrl,
                    smartAccountAddress: localStorageAddress,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    signer:comethSigner
                });
            } else {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain:baseSepolia,
                    baseUrl,
                    entryPoint: ENTRYPOINT_ADDRESS_V07,
                    signer:comethSigner
                });
                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: baseSepolia,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                chain: baseSepolia,
                bundlerTransport: http(bundlerUrl),
                middleware: {
                    sponsorUserOperation: paymasterClient.sponsorUserOperation,
                    gasPrice: paymasterClient.gasPrice,
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
