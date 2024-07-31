"use client";

import { createNewSigner } from "@cometh/connect-sdk-4337";
import React from "react";
import { base } from "viem/chains";
import { useSmartAccount } from "../modules/hooks/useSmartAccount";

export default function App() {
    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;

    const { setNewSigner } = useSmartAccount();

    const createRequest = async () => {
        const signer = await createNewSigner(
            apiKey,
            "http://127.0.0.1:8000/connect",
            { passKeyName: "test" }
        );

        setNewSigner(signer);
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
                            <button onClick={createRequest}>
                                Create new signer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
