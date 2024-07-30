"use client";

import React, { useState } from "react";

import { api } from "../../api";
import ConnectWallet from "./components/ConnectWallet";
import Transaction from "./components/Transaction";
import { useSmartAccount } from "./modules/hooks/useSmartAccount";
import { createNewSigner, createNewSignerWithAccountAddress } from "@cometh/connect-sdk-4337";

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY
const apiKeySecret = process.env.NEXT_PUBLIC_COMETH_API_SECRET
const baseUrl = process.env.NEXT_PUBLIC_COMETH_BASE_URL

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

    const validate = async () => {
        const signer = {
            signerAddress: "0x5929d4e3d17318BaB73026644A904AdbC6fa7989",
            deviceData: {
                browser: "Firefox",
                os: "macOS",
                platform: "desktop",
            },
        };

        await smartAccount.validateAddDevice({ signer });
    };

    const setUpRecovery = async () => {
        try {
            const hash = await smartAccount.setUpRecoveryModule();
            console.log({ hash });
        } catch (e) {
            console.log(e);
        }
    };

    const startRecovery = async () => {
        try {
            const signer = await createNewSignerWithAccountAddress(apiKey!, baseUrl!, "0xE5a5D7618e3081e0FC06D9c353187058589eb45B", {});
            console.log({ signer });

            const body = {
                walletAddress: smartAccount.account?.address,
                newOwner: signer.signerAddress,
            };

            await api.post("/recovery/start", body);
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

                                <button onClick={startRecovery}>
                                    Start recovery
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
