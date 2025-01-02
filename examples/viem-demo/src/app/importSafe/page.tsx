"use client";

import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
    importSafeActions,
} from "@cometh/connect-sdk-4337";
import { http, type Hex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { gnosis } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export default function App() {
    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL!;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL!;
    const walletToImport = "0x";

    const migrateSafe = async () => {
        const legacyWalletAddress = walletToImport;

        const signer = privateKeyToAccount(process.env.NEXT_PUBLIC_PRIVATE_KEY! as Hex);

        const safe4337SmartAccount = await createSafeSmartAccount({
            apiKey,
            chain: gnosis,
            smartAccountAddress: legacyWalletAddress,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            signer,
        });

        const paymasterClient = await createComethPaymasterClient({
            transport: http(paymasterUrl),
            chain: gnosis,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        });
        const smartAccountClient = createSmartAccountClient({
            account: safe4337SmartAccount,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain: gnosis,
            bundlerTransport: http(bundlerUrl, {
                retryCount: 10,
                retryDelay: 200,
            }),
            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation,
                gasPrice: paymasterClient.gasPrice,
            },
        });

        const extendedClient = smartAccountClient.extend(importSafeActions());

        const importMessage = await extendedClient.prepareImportSafe1_4Tx();

        const signature = (await extendedClient.signTransactionByExternalOwner({
            signer,
            tx: importMessage.tx,
        })) as Hex;

        await extendedClient.importSafe({
            signature,
            ...importMessage,
        });

        const safe4337SmartAccountImported = await createSafeSmartAccount({
            apiKey,
            chain: gnosis,
            smartAccountAddress: legacyWalletAddress,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        });

        const smartAccountClientImported = createSmartAccountClient({
            account: safe4337SmartAccountImported,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain: gnosis,
            bundlerTransport: http(bundlerUrl, {
                retryCount: 10,
                retryDelay: 200,
            }),
            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation,
                gasPrice: paymasterClient.gasPrice,
            },
        });

        const calldata = encodeFunctionData({
            abi: countContractAbi,
            functionName: "count",
        });

        const txHash = await smartAccountClientImported.sendTransaction({
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
