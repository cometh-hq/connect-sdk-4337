"use client";

import React, { useEffect, useState } from "react";

import {
    useAccount,
    useConnect,
    useDisconnect,
    useGetGasPrice,
    useRetrieveAccountAddressFromPasskeyId,
    useSendTransaction,
    useSignMessage,
    useValidateAddDevice,
    useVerifyMessage,
} from "@cometh/connect-react-hooks";
import type { Hex } from "viem";
import Transaction from "./components/Transaction";

export default function App() {
    const { connect, connectAsync, error: connectError } = useConnect();

    const { address } = useAccount();
    const { disconnectAsync, disconnect } = useDisconnect();
    const {
        sendTransactionAsync,
        sendTransaction,
        data: hash,
    } = useSendTransaction();
    const { validateAddDevice, validateAddDeviceAsync, isError, isSuccess } =
        useValidateAddDevice();
    const { signMessage, signMessageAsync, data } = useSignMessage();

    const { verifyMessageAsync, data: verify } = useVerifyMessage();

    const [transactionSuccess, setTransactionSuccess] = useState(false);

    const localStorageAddress = window.localStorage.getItem(
        "walletAddress"
    ) as Hex;

    const connectWallet = async () => {
        console.log({ localStorageAddress });
        connectAsync({ address: localStorageAddress });
    };

    useEffect(() => {
        if (!localStorageAddress && address) {
            window.localStorage.setItem("walletAddress", address);
        }
    }, [address]);

    console.log({ address });

    const test = async () => {
        const message = "hello world";

        const sig = await signMessageAsync({ message });

        const verif = await verifyMessageAsync({ message, signature: sig });
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
                        <div
                            className="grid divide-gray-900/5 bg-gray-50"
                            onClick={connectWallet}
                        >
                            connect
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

                        <button onClick={disconnectAsync}>disconnect</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
