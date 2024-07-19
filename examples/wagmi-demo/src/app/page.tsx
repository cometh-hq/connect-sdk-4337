"use client";

import React, { useState } from "react";

import { useAccount, useConnect, useWriteContract } from "wagmi";
import Transaction from "./components/Transaction";

export default function App() {
    const { address, isConnected } = useAccount();
    const {connectors, connect} = useConnect();

    const { data: hash, writeContract } = useWriteContract();

    const [transactionSuccess, setTransactionSuccess] = useState(false);

    const connectWithWagmi = async () => {
        connect({ connector: connectors[0] });
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

                    <div className="grid divide-gray-900/5 bg-gray-50" onClick={connectWithWagmi}>
                           connect
                           </div>

                        {isConnected && (
                            <Transaction
                                hash={hash!}
                                writeContract={writeContract}
                                address={address!}
                                transactionSuccess={transactionSuccess}
                                setTransactionSuccess={setTransactionSuccess}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
