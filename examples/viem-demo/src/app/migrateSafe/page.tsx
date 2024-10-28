"use client";

import {
    ComethWallet,
    ConnectAdaptor,
    SupportedNetworks,
} from "@cometh/connect-sdk";
import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createLegacySafeSmartAccount,
    createSafeSmartAccount,
    createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import { http, encodeFunctionData } from "viem";
import { baseSepolia } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export default function App() {
    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL!;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL!;

    const migrateSafe = async () => {
        // Step 1: TO DO If you create a new legcay wallet and want to update, if not go to step 2
        const walletAdaptor = new ConnectAdaptor({
            chainId: SupportedNetworks.BASE_SEPOLIA,
            apiKey: apiKey,
        });

        const wallet = new ComethWallet({
            authAdapter: walletAdaptor,
            apiKey: apiKey,
        });

        await wallet?.connect();

        const legacyWalletAddress = wallet.getAddress();

        // Step 2
        const legacyClient = await createLegacySafeSmartAccount({
            apiKeyLegacy: apiKey,
            apiKey4337: apiKey,
            chain: baseSepolia,
            smartAccountAddress: legacyWalletAddress,
        });

        // Step 3
        const hasMigrated = await legacyClient.hasMigrated();

        if (!hasMigrated) await legacyClient.migrate();

        // Step 4
        const safe4337SmartAccount = await createSafeSmartAccount({
            apiKey,
            chain: baseSepolia,
            smartAccountAddress: legacyWalletAddress,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        });

        // Step 5
        const paymasterClient = await createComethPaymasterClient({
            transport: http(paymasterUrl),
            chain: baseSepolia,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        });
        const smartAccountClient = createSmartAccountClient({
            account: safe4337SmartAccount,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain: baseSepolia,
            bundlerTransport: http(bundlerUrl),
            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation,
                gasPrice: paymasterClient.gasPrice,
            },
        });

        const calldata = encodeFunctionData({
            abi: countContractAbi,
            functionName: "count",
        });

        // Step 6
        const txHash = await smartAccountClient.sendTransaction({
            to: COUNTER_CONTRACT_ADDRESS,
            data: calldata,
        });

        console.log("Transaction hash:", txHash);
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
                            <button onClick={migrateSafe}>Migrate Safe</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
