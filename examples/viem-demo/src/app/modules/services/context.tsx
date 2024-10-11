"use client";
import { createContext, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export const AccountContext = createContext<{
    smartAccount: any | null;
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
