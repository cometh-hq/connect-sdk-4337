import { NotWithinSmartAccountProviderError } from "@/errors";
import { ConnectContext } from "@/providers/ConnectProvider";
import { useContext } from "react";

/**
 * @description This function will retrieve a smart account and associated information from the ConnectProvider for custom use.
 */
export const useSmartAccount = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new NotWithinSmartAccountProviderError();
    }

    return context;
};
