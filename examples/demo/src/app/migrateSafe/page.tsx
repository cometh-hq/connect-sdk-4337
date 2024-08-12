"use client";

import { importSafe, migrateSafeV3toV4 } from "@cometh/connect-sdk-4337";
import { createWalletClient, custom } from "viem";
import { polygon } from "viem/chains";

export default function App() {
    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const migrateSafe = async () => {
        const [account] = await (window as any).ethereum!.request({
            method: "eth_requestAccounts",
        });

        const walletClient = createWalletClient({
            account,
            chain: polygon,
            transport: custom((window as any).ethereum!),
        });

        const hash = await migrateSafeV3toV4({
            walletClient,
            safeAddress: "0x1f116831295062Ef1e854E4DCd5D16aDbCAe2cf6",
            chain: polygon,
        });
    };

    const importSafeV4 = async () => {
        const [account] = await (window as any).ethereum!.request({
            method: "eth_requestAccounts",
        });

        const walletClient = createWalletClient({
            account,
            chain: polygon,
            transport: custom((window as any).ethereum!),
        });

        const hash = await importSafe({
            apiKey,
            walletClient,
            safeAddress: "0x1f116831295062Ef1e854E4DCd5D16aDbCAe2cf6",
            baseUrl,
        });

        console.log({ hash });
    };

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div className="md:min-h-[70vh] gap-2 flex flex-col justify-center items-center">
                <div className="absolute left-1/2 z-10 mt-5 flex w-screen max-w-max -translate-x-1/2 px-4">
                    <div className="w-screen max-w-md flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
                        <div className="grid divide-gray-900/5 bg-gray-50">
                            <button onClick={migrateSafe}>Migrate Safe</button>
                        </div>
                        <div className="grid divide-gray-900/5 bg-gray-50">
                            <button onClick={importSafeV4}>Import Safe</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
