"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter } from "next/font/google";
import "./lib/ui/globals.css";

import { smartAccountConnector } from "@cometh/connect-sdk-4337";
import type { Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { http, WagmiProvider, createConfig } from "wagmi";

const inter = Inter({
    subsets: ["latin"],
});

const queryClient = new QueryClient();

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
const baseUrl = "http://127.0.0.1:8000/connect";
const rpcUrl = "https://arbitrum-sepolia.blockpi.network/v1/rpc/public";

if (!apiKey) throw new Error("API key not found");
if (!bundlerUrl) throw new Error("Bundler Url not found");

const localStorageAddress = window.localStorage.getItem("walletAddress") as Hex;

const connector = smartAccountConnector({
    apiKey,
    bundlerUrl,
    rpcUrl,
    smartAccountAddress: localStorageAddress,
    baseUrl,
});

const config = createConfig({
    chains: [arbitrumSepolia],
    connectors: [connector],
    transports: {
        [arbitrumSepolia.id]: http(),
    },
    ssr: true,
});

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <body className={inter.className}>{children}</body>
                </QueryClientProvider>
            </WagmiProvider>
        </html>
    );
}
