"use client";

import React, { useState } from "react";

import ConnectWallet from "./components/ConnectWallet";
import Transaction from "./components/Transaction";
import { useSmartAccount } from "./modules/hooks/useSmartAccount";

export default function App() {

  const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
  const baseUrl = "http://127.0.0.1:8000/connect"

  const { isConnecting, isConnected, connect, connectionError, smartAccount, newSigner } =
  useSmartAccount();
  const [transactionSuccess, setTransactionSuccess] = useState(false);


  const validate = async() => {
    const signer = { signerAddress: "0xc24bdc3D083ccd21B1E77514b58BAB45ED413955", deviceData: { browser: "Firefox", os: "macOS", platform: "desktop" }}

    await smartAccount.validateAddDevice({apiKey, baseUrl, signer})
  }


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
                setTransactionSuccess={setTransactionSuccess}
              />

              <button onClick={validate}>Validate Add Device</button>
              </>
            )}

            
          </div>
        </div>
      </div>
    </div>
  );
}
