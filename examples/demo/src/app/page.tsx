"use client";

import React, { useState } from "react";

import {
    createNewSignerWithAccountAddress,
    retrieveAccountAddressFromPasskeys,
} from "@cometh/connect-sdk-4337";
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

    const recoverWalletAddress = async () => {
        console.log(apiKey, baseUrl);
    };

    const verifyMessage = async () => {
        const t = await api.get("/wallet");

        console.log(t.data);
    };

    const validateAddDevice = async () => {
        try {
            await smartAccount.validateAddDevice({
                signer: {
                    deviceData: {
                        os: "macOS",
                        browser: "Chrome",
                        platform: "mobile",
                    },
                    signerAddress: "0xa32A90B9B3190d587B9c45EDb56D0D84CA34d024",
                    publicKeyId: "0x2e57f5c6d8b2a048333ce683d2835a7c63524231",
                    publicKeyX:
                        "0x6645b3def4604d08a3d6fb583e1a72bd43e18e0cf1dca639b1939245ec9a2d2f",
                    publicKeyY:
                        "0x3fdddf5c555997256e56c0f71eb5587353d5d426208b70955e5705995a9b79e8",
                },
            });
        } catch (e) {
            console.log(e);
        }
    };

    const setUpRecovery = async () => {
        try {
            await smartAccount.setUpRecoveryModule();
        } catch (e) {
            console.log(e);
        }
    };

    const cancelRecovery = async () => {
        try {
            await smartAccount.cancelRecoveryRequest();
        } catch (e) {
            console.log(e);
        }
    };

    const startRecovery = async () => {
        try {
            const signer = await createNewSignerWithAccountAddress({
                apiKey: apiKey!,
                baseUrl: baseUrl!,
                smartAccountAddress: smartAccount.account?.address,
                params: {},
            });

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
            const body = {
                walletAddress: "0x2FF1fF21FB9b379Aab9c0Fd2E8E5a030B5076142",
            };
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

                                <button onClick={cancelRecovery}>
                                    Cancel reocvery
                                </button>

                                <button onClick={verifyMessage}>get</button>
                            </>
                        )}

                        {!isConnected && (
                            <button onClick={recoverWalletAddress}>
                                recoverWalletAddress
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
