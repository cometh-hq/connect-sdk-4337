"use client";
import  { createContext, useState } from "react";
import type {  Dispatch, SetStateAction } from "react";

export const AccountContext = createContext<{
  account: any | null;
  setAccount: Dispatch<SetStateAction<any | null>>;
}>({
  account: null,
  setAccount: () => {},
});

export function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [account, setAccount] = useState<any | null>(null);


  return (
    <AccountContext.Provider
    value={{
      account,
      setAccount,
    }}
  >
    {children}
  </AccountContext.Provider>
  );
}
