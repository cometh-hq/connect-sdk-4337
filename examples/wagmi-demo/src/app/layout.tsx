"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter } from "next/font/google";
import "./lib/ui/globals.css";

import { smartAccountConnector } from "@cometh/connect-sdk-4337";
import { arbitrumSepolia } from "viem/chains";
import { http, WagmiProvider, createConfig } from "wagmi";

const inter = Inter({
    subsets: ["latin"],
});

const queryClient = new QueryClient();

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

if (!apiKey) throw new Error("API key not found");
if (!bundlerUrl) throw new Error("Bundler Url not found");

const connector = smartAccountConnector({
    apiKey,
    bundlerUrl,
    chain: arbitrumSepolia,
    paymasterUrl,
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
