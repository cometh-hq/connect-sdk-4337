"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";


export default function App() {

    const searchParams = useSearchParams();

    const signerData = useMemo(() => {
        const keys = ["os", "b", "p", "x", "y", "id", "ad"];
        const data: Record<string, string> = {};
        keys.forEach((key) => {
            const value = searchParams.get(key);
            if (value) {
                data[key] = value;
            }
        });
        return data;
    }, [searchParams]);

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

                        {/* Signer Data Display */}
                        {Object.keys(signerData).length > 0 && (
                            <div className="p-4 border-t bg-white">
                                <h3 className="font-semibold mb-2">Signer Info</h3>
                                <ul className="text-sm space-y-1">
                                    {Object.entries(signerData).map(([key, value]) => (
                                        <li key={key}>
                                            <strong>{key.toUpperCase()}:</strong> {value}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
