"use client";
import { createContext, useState } from "react";
import type { Dispatch, JSX, SetStateAction } from "react";
import type React from "react";

export const AccountContext = createContext<{
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    smartAccount: any | null;
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    setSmartAccount: Dispatch<SetStateAction<any | null>>;
}>({
    smartAccount: null,
    setSmartAccount: () => {},
});

export function WalletProvider({
    children,
}: {
    children: React.ReactNode;
}): JSX.Element {
    // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    return (
        <AccountContext.Provider
            value={{
                smartAccount,
                setSmartAccount,
            }}
        >
            {children}
        </AccountContext.Provider>
    );
}
