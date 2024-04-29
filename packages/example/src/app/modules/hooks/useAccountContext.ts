import { useContext } from "react";
import { AccountContext } from "../services/context";

export function useAccountContext() {
  const {
    account,
    setAccount,
  } = useContext(AccountContext);
  return {
    account,
    setAccount,
  };
}
