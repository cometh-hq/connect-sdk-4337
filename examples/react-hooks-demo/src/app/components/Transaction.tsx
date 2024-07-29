"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import {
    http,
    type Address,
    createPublicClient,
    encodeFunctionData,
    getContract,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

const COUNTER_CONTRACT_ADDRESS = "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(),
    cacheTime: 60_000,
    batch: {
        multicall: { wait: 50 },
    },
});

const counterContract = getContract({
    address: COUNTER_CONTRACT_ADDRESS,
    abi: countContractAbi,
    client: publicClient,
});

interface TransactionProps {
    hash: string | null;
    sendTransaction: any;
    address: Address;
    transactionSuccess: boolean;
    setTransactionSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

function Transaction({
    hash,
    sendTransaction,
    address,
    transactionSuccess,
    setTransactionSuccess,
}: TransactionProps) {
    const [isTransactionLoading, setIsTransactionLoading] =
        useState<boolean>(false);
    const [transactionSended, setTransactionSended] = useState<any | null>(
        null
    );
    const [transactionResponse, setTransactionResponse] = useState<any | null>(
        null
    );
    const [transactionFailure, setTransactionFailure] = useState(false);
    const [nftBalance, setNftBalance] = useState<number>(0);

    function TransactionButton({
        sendTestTransaction,
        isTransactionLoading,
        label,
    }: {
        sendTestTransaction: () => Promise<void>;
        isTransactionLoading: boolean;
        label: string;
    }) {
        return (
            <button
                className="mt-1 flex h-11 py-2 px-4 gap-2 flex-none items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200"
                onClick={sendTestTransaction}
            >
                {isTransactionLoading ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <PlusIcon width={16} height={16} />
                    </>
                )}
                {label}
            </button>
        );
    }

    useEffect(() => {
        if (address) {
            (async () => {
                const balance = await counterContract.read.counters([address]);
                setNftBalance(Number(balance));
            })();
        }
    }, []);

    const sendTestTransaction = async () => {
        setTransactionSended(null);
        setTransactionResponse(null);
        setTransactionFailure(false);
        setTransactionSuccess(false);

        setIsTransactionLoading(true);
        try {
            if (!address) throw new Error("No wallet instance");

            const calldata = encodeFunctionData({
                abi: countContractAbi,
                functionName: "count",
            });

            const txHash = await sendTransaction({
                transactions: {
                    to: COUNTER_CONTRACT_ADDRESS,
                    value: 0,
                    data: calldata,
                },
            });

            setTransactionSended(txHash);

            const txResponse = await publicClient.waitForTransactionReceipt({
                hash: txHash,
            });

            setTransactionResponse(txResponse);

            const balance = await counterContract.read.counters([address]);
            setNftBalance(Number(balance));

            setTransactionSuccess(true);
        } catch (e) {
            console.log("Error:", e);
            setTransactionFailure(true);
        }

        setIsTransactionLoading(false);
    };

    return (
        <main>
            <div className="p-4">
                <div className="relative flex items-center gap-x-6 rounded-lg p-4">
                    <TransactionButton
                        sendTestTransaction={() => sendTestTransaction()}
                        isTransactionLoading={isTransactionLoading}
                        label="Increment Counter"
                    />
                    <p className=" text-gray-600">{nftBalance}</p>
                </div>
            </div>
            {transactionSended && !transactionResponse && (
                <Alert
                    state="information"
                    content="Transaction in progress.. (est. time 10 sec)"
                />
            )}
            {transactionSuccess && (
                <Alert
                    state="success"
                    content="Transaction confirmed !"
                    link={{
                        content: "Go see your transaction",
                        url: `${process.env.NEXT_PUBLIC_SCAN_URL}tx/${transactionResponse?.transactionHash}`,
                    }}
                />
            )}
            {transactionFailure && (
                <Alert state="error" content="Transaction Failed !" />
            )}
        </main>
    );
}

export default Transaction;
