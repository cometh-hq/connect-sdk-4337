import { polygon, polygonMumbai } from "viem/chains";
import {
    createSigner,
    ENTRYPOINT_ADDRESS_V06,
    createSmartAccountClient,
    signerToModularSmartAccount,
} from "@cometh/connect-sdk-4337";

import countContractAbi from "../contract/counterABI.json";

import { http, encodeFunctionData, type Hex } from "viem";
import { useState } from "react";

const COUNTER_CONTRACT_ADDRESS = "0x84ADD3fa2c2463C8cF2C95aD70e4b5F602332160";
const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;

function ConnectWallet(): JSX.Element {
    if (!apiKey) throw new Error("API key not found");
    if (!bundlerUrl) throw new Error("Bundler Url not found");

    const [txHash, setTxHash] = useState<string>("");

    const connect = async () => {
        const localStorageAddress = window.localStorage.getItem(
            "walletAddress"
        ) as Hex;

        const comethSigner = await createSigner({
            apiKey,
            smartAccountAddress: localStorageAddress,
            disableEoaFallback: false,
        });

        let smartAccount;

        if (localStorageAddress) {
            smartAccount = await signerToModularSmartAccount({
                comethSigner,
                apiKey,
                rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/KNNW0UQ8T-LGoYE7dOW31o-fSNqWtg5I",
                smartAccountAddress: localStorageAddress,
                entryPoint: ENTRYPOINT_ADDRESS_V06,
            });
        } else {
            smartAccount = await signerToModularSmartAccount({
                comethSigner,
                apiKey,
                rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/KNNW0UQ8T-LGoYE7dOW31o-fSNqWtg5I",
                entryPoint: ENTRYPOINT_ADDRESS_V06,
            });
            window.localStorage.setItem("walletAddress", smartAccount.address);
        }

        console.log({ smartAccount });

        const smartAccountClient = createSmartAccountClient({
            account: smartAccount,
            entryPoint: ENTRYPOINT_ADDRESS_V06,
            chain: polygon,
            bundlerTransport: http(bundlerUrl),
        });

        console.log({ smartAccountClient });

        const calldata = encodeFunctionData({
            abi: countContractAbi,
            functionName: "count",
        });

        console.log({ calldata });

        const txHash = await smartAccountClient.sendTransaction({
            to: COUNTER_CONTRACT_ADDRESS,
            data: calldata,
        });

        console.log({ txHash });

        setTxHash(txHash);
    };
    return (
        <>
            <button onClick={connect}>connect</button>

            {txHash && (
                <a
                    href={`https://jiffyscan.xyz/userOpHash/${txHash}?network=mumbai`}
                    target="_blank"
                    className="flex-none rounded-full bg-gray-900 px-3.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                >
                    Explorer link <span aria-hidden="true">&rarr;</span>
                </a>
            )}
        </>
    );
}

export default ConnectWallet;
