import { ConnectContext } from "@/providers/ConnectProvider";
import { useCallback, useContext } from "react";
import type { Address } from "viem";

/**
 * @description A custom hook for managing connection to a smart account.
 *
 * This hook provides access to the smart account client, address, and a method to connect
 * or reconnect to a smart account. It must be used within a ConnectProvider context.
 *
 * @throws {Error} If used outside of a ConnectProvider context.
 *
 * @example
 * ```tsx
 * import { useConnect } from "@/hooks/useConnect";
 * import { useState } from "react";
 *
 * export const SmartAccountConnection = () => {
 *   const { connect, smartAccountClient, smartAccountAddress, isLoading } = useConnect();
 *   const [customAddress, setCustomAddress] = useState<string>("");
 *
 *   const handleConnect = async () => {
 *     try {
 *       await connect(customAddress as Address);
 *       console.log("Connected successfully");
 *     } catch (error) {
 *       console.error("Connection failed:", error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         value={customAddress}
 *         onChange={(e) => setCustomAddress(e.target.value)}
 *         placeholder="Custom address (optional)"
 *       />
 *       <button onClick={handleConnect} disabled={isLoading}>
 *         {smartAccountClient ? "Reconnect" : "Connect"} to Smart Account
 *       </button>
 *       {smartAccountAddress && (
 *         <p>Connected to Smart Account: {smartAccountAddress}</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `connect`: A function to connect or reconnect to a smart account. It optionally accepts an address.
 * - `smartAccountClient`: The current smart account client instance, if connected.
 * - `smartAccountAddress`: The address of the connected smart account.
 * - Additional properties from the ConnectContext.
 */

export const useConnect = () => {
    const context = useContext(ConnectContext);

    if (context === undefined) {
        throw new Error("useConnect must be used within a ConnectProvider");
    }

    const {
        smartAccountClient,
        smartAccountAddress,
        updateSmartAccountClient,
        ...rest
    } = context;

    const connect = useCallback(
        async (address?: Address) => {
            await updateSmartAccountClient(address);
        },
        [updateSmartAccountClient]
    );

    return {
        connect,
        smartAccountClient,
        smartAccountAddress,
        ...rest,
    };
};
