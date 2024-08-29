"use client";

import React, { useState } from "react";

import { createNewSignerWithAccountAddress } from "@cometh/connect-sdk-4337";
import { api } from "../../api";
import ConnectWallet from "./components/ConnectWallet";
import Transaction from "./components/Transaction";
import { useSmartAccount } from "./modules/hooks/useSmartAccount";

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export default function App() {
    const {
        isConnecting,
        isConnected,
        connect,
        connectionError,
        smartAccount,
        newSigner,
    } = useSmartAccount();
    const [transactionSuccess, setTransactionSuccess] = useState(false);

    const setUpRecovery = async () => {
        try {
            await smartAccount.setUpRecoveryModule();
        } catch (e) {
            console.log(e);
        }
    };

    const startRecovery = async () => {
        try {
            const signer = await createNewSignerWithAccountAddress(
                apiKey!,
                baseUrl!,
                smartAccount.account?.address
            );

            const body = {
                walletAddress: smartAccount.account?.address,
                newOwner: signer.signerAddress,
                publicKeyId: signer.publicKeyId,
                publicKeyX: signer.publicKeyX,
                publicKeyY: signer.publicKeyY,
                deviceData: signer.deviceData,
            };

            await api.post("/recovery/start", body);
        } catch (e) {
            console.log(e);
        }
    };

    const finalizeRecovery = async () => {
        try {
            const body = { walletAddress: "0x597799919400404bfd75D95375BB5136EB2883D8" };
            await api.post(`/recovery/finalize`, body);
        } catch (e) {
            console.log(e);
        }
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
                            <ConnectWallet
                                isConnected={isConnected}
                                isConnecting={isConnecting}
                                connect={connect}
                                connectionError={connectionError}
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

                                <button onClick={setUpRecovery}>
                                    Set up recovery
                                </button>

                                <button onClick={startRecovery}>
                                    Start recovery
                                </button>
                            </>
                        )}

                        {!isConnected && (
                            <button onClick={finalizeRecovery}>
                                Finalize recovery
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
