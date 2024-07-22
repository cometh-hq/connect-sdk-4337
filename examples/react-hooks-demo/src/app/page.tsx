"use client";

import React, { useEffect, useState } from "react";

import { useConnect, useSendTransaction } from "@cometh/connect-react-hooks";
import { type Hex, isAddress } from "viem";
import Transaction from "./components/Transaction";

export default function App() {
    const { connect, smartAccountAddress } = useConnect();

    const {
        sendTransaction,
        data: hash,
        error,
        status,
        isPending,
    } = useSendTransaction();

    const [transactionSuccess, setTransactionSuccess] = useState(false);

    const localStorageAddress = window.localStorage.getItem(
        "walletAddress"
    ) as Hex;

    const connectWallet = async () => {
        connect(localStorageAddress);

        if (!localStorageAddress)
            window.localStorage.setItem("walletAddress", smartAccountAddress);
    };

    useEffect(() => {
        if (smartAccountAddress) {
            window.localStorage.setItem("walletAddress", smartAccountAddress);
        }
    }, [smartAccountAddress]);

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
                        <div
                            className="grid divide-gray-900/5 bg-gray-50"
                            onClick={connectWallet}
                        >
                            connect
                        </div>

                        {isAddress(smartAccountAddress) && (
                            <Transaction
                                hash={hash!}
                                sendTransaction={sendTransaction}
                                address={smartAccountAddress}
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
