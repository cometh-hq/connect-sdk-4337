import { ConnectContext } from "@/providers/ConnectProvider";
import { useContext } from "react";

/**
 * @description This function will retreive a smart account and associated information from the ConnectProvider for custom use.
 */
export const useSmartAccount = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("Hooks must be used within a SmartAccountProvider");
    }

    return context;
};
