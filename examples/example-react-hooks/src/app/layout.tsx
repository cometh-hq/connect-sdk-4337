"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter } from "next/font/google";
import "./lib/ui/globals.css";

import { ConnectProvider } from "@cometh/connect-react-hooks";
import { arbitrumSepolia } from "viem/chains";
import { http, WagmiProvider, createConfig } from "wagmi";

const inter = Inter({
    subsets: ["latin"],
});

const queryClient = new QueryClient();

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;
const baseUrl = "http://127.0.0.1:8000/connect";
const rpcUrl = "https://arbitrum-sepolia.blockpi.network/v1/rpc/public";

if (!apiKey) throw new Error("API key not found");
if (!bundlerUrl) throw new Error("Bundler Url not found");

const config = createConfig({
    chains: [arbitrumSepolia],
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
                    <ConnectProvider
                        config={{
                            paymasterUrl,
                            bundlerUrl,
                            baseUrl,
                            apiKey,
                            rpcUrl,
                            autoconnect: false
                        }}
                        queryClient={queryClient}
                    >
                        <body className={inter.className}>{children}</body>
                    </ConnectProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </html>
    );
}
