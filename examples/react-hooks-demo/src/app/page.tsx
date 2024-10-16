"use client";

import React, { useEffect, useState } from "react";
import ConnectWallet from "./components/ConnectWallet";

import {
    useAccount,
    useConnect,
    useDisconnect,
    useSendTransaction,
    useSwitchChain
} from "@cometh/connect-react-hooks";
import type { Hex } from "viem";
import Transaction from "./components/Transaction";
import { baseSepolia } from "viem/chains";

export default function App() {
    const { isPending, connectAsync, error: connectError } = useConnect();

    const { address, smartAccountClient } = useAccount();
    const { disconnectAsync } = useDisconnect();
    const { sendTransactionAsync, data: hash } = useSendTransaction();

    const {switchChainAsync} = useSwitchChain();

    const [transactionSuccess, setTransactionSuccess] = useState(false);



    const connectWallet = async () => {
        connectAsync({address:"0x36471744F66026557CE005b1B79410477F6B0616"});
    };

    useEffect(() => {
        if ( address) {
            window.localStorage.setItem("walletAddress", address);
        }

        if (!address) {
            setTransactionSuccess(false);
        }
    }, [address]);

    const switchChain = async () => {

        await switchChainAsync({
            chain:baseSepolia, 
            bundlerUrl:"https://bundler.cometh.io/84532?apikey=0uJydu7VY2lGKIcOBYVFWxrs1RHlqYMO", 
            paymasterUrl:"https://paymaster.cometh.io/84532?apikey=YfYHInV6s65wUlQuiLUCOpPOyRPyDVj6"});


    }

    console.log({smartAccountClient})

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
                                isConnected={address !== undefined}
                                isConnecting={isPending}
                                connect={connectWallet}
                                connectionError={connectError}
                                address={address!}
                            />
                        </div>
                        {address && (
                            <Transaction
                                hash={hash!}
                                sendTransaction={sendTransactionAsync}
                                address={address}
                                transactionSuccess={transactionSuccess}
                                setTransactionSuccess={setTransactionSuccess}
                            />
                        )}
                        {address && (
                            <div className="grid divide-grey-900/5 bg-white-50">
                                <button
                                    disabled={!address || !!connectError}
                                    className="flex items-center justify-center gap-x-2.5 p-3 font-semibold text-gray-900 hover:bg-gray-100 disabled:bg-white"
                                    onClick={disconnectAsync}
                                >
                                    Disconnect
                                </button>
                            </div>
                        )}
                        <button onClick={switchChain}>switch</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
