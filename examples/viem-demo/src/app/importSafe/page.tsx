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
    importSafeActions,
    retrieveLegacyWalletAddress,
} from "@cometh/connect-sdk-4337";
import { http, type Hex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, gnosis } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export default function App() {
    const apiKey = "";
    const apiKeyLegacy = "";
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL!;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL!;

    const migrateSafe = async () => {
        // Step 1: TO DO If you create a new legcay wallet and want to update, if not go to step 2
                const walletAdaptor = new ConnectAdaptor({
            chainId: SupportedNetworks.GNOSIS,
            apiKey: apiKeyLegacy,
        });

        const wallet = new ComethWallet({
            authAdapter: walletAdaptor,
            apiKey: apiKeyLegacy,
        });

        await wallet?.connect();

        const legacyWalletAddress = wallet.getAddress();

        console.log({ legacyWalletAddress });

        await wallet.addOwner("0x39946fd82C9C86c9A61BceeD86fbdd284590bDd9") 

                localStorage.removeItem(`cometh-connect-${legacyWalletAddress}`);


                await new Promise((resolve) => setTimeout(resolve, 10000));


        
       

    /*     const legacyWalletAddress =
            "0x5d050920d8049a08c01F34D6F935f9Fbf5Ea6ca1";

       ;*/

    
       const signer = privateKeyToAccount(
        ""
    ) 


        // Step 4
        const safe4337SmartAccount = await createSafeSmartAccount({
            apiKey,
            chain: gnosis,
            smartAccountAddress: legacyWalletAddress,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            signer,
            baseUrl: "https://api.4337.develop.core.cometh.tech",
        });

        // Step 5
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
                retryCount:10,
                retryDelay: 200,
            }),
            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation,
                gasPrice: paymasterClient.gasPrice,
            },
        });

        const extendedClient = smartAccountClient.extend(importSafeActions());

          console.log({ extendedClient });

        const importMessage = await extendedClient.prepareImportSafe1_3Tx();

        console.log({ importMessage });

        const signature = (await extendedClient.signTransactionByExternalOwner({
            signer,
            tx: importMessage.tx,
        })) as Hex;

        console.log({ signature });

        await extendedClient.importSafe({
            signature,
            tx: importMessage.tx,
            passkey: importMessage.passkey,
            eoaSigner: importMessage.eoaSigner,
        });
        
        const safe4337SmartAccountV2 = await createSafeSmartAccount({
            apiKey,
            chain: gnosis,
            smartAccountAddress: legacyWalletAddress,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            baseUrl: "https://api.4337.develop.core.cometh.tech",
        });

        const smartAccountClientV2 = createSmartAccountClient({
            account: safe4337SmartAccountV2,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            chain: gnosis,
            bundlerTransport: http(bundlerUrl, {
                retryCount:10,
                retryDelay: 200,
            }),            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation,
                gasPrice: paymasterClient.gasPrice,
            },
        });

        const calldata = encodeFunctionData({
            abi: countContractAbi,
            functionName: "count",
        });

        // Step 6
        const txHash = await smartAccountClientV2.sendTransaction({
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
