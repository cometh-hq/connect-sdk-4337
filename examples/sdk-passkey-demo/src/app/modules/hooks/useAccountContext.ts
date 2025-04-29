import { useContext } from "react";
import { AccountContext } from "../services/context";

export function useAccountContext() {
    const { smartAccount, setSmartAccount } = useContext(AccountContext);
    return {
        smartAccount,
        setSmartAccount,
    };
}
