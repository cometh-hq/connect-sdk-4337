"use client";

import React, { useState } from "react";

import ConnectWallet from "./components/ConnectWallet";
import Transaction from "./components/Transaction";
import { useSmartAccount } from "./modules/hooks/useSmartAccount";

export default function App() {
    const {
        isConnecting,
        isConnected,
        connect,
        connectionError,
        smartAccount,
    } = useSmartAccount();
    const [transactionSuccess, setTransactionSuccess] = useState(false);

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
                            <ConnectWallet
                                isConnected={isConnected}
                                isConnecting={isConnecting}
                                connect={connect}
                                connectionError={connectionError}
                                // biome-ignore lint/style/noNonNullAssertion: TODO
                                smartAccount={smartAccount!}
                            />
                        </div>

                        {isConnected && (
                            <>
                                <Transaction
                                    smartAccount={smartAccount}
                                    transactionSuccess={transactionSuccess}
                                    setTransactionSuccess={
                                        setTransactionSuccess
                                    }
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
