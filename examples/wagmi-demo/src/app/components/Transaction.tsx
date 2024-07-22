"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import { http, type Address, createPublicClient, getContract } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";
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
    writeContract: any;
    address: Address;
    transactionSuccess: boolean;
    setTransactionSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

function Transaction({
    hash,
    writeContract,
    address,
    transactionSuccess,
    setTransactionSuccess,
}: TransactionProps) {
    const { connector } = useAccount();
    const { data: client } = useWalletClient();
    const [isTransactionLoading, setIsTransactionLoading] =
        useState<boolean>(false);
    const [transactionSended, setTransactionSended] = useState<any | null>(
        null
    );
    const [transactionFailure, setTransactionFailure] = useState(false);
    const [nftBalance, setNftBalance] = useState<number>(0);

    function TransactionButton({
        sendTestTransaction,
        isTransactionLoading,
    }: {
        sendTestTransaction: () => Promise<void>;
        isTransactionLoading: boolean;
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
                )}{" "}
                Increment counter
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
        setTransactionFailure(false);
        setTransactionSuccess(false);

        setIsTransactionLoading(true);
        try {
            if (!address) throw new Error("No wallet instance");

            writeContract({
                abi: countContractAbi,
                address: COUNTER_CONTRACT_ADDRESS,
                functionName: "count",
                args: [],
            });

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
                        sendTestTransaction={sendTestTransaction}
                        isTransactionLoading={isTransactionLoading}
                    />
                    <p className=" text-gray-600">{nftBalance}</p>
                </div>
            </div>

            {hash && (
                <Alert
                    state="success"
                    content="Transaction confirmed !"
                    link={{
                        content: "Go see your transaction",
                        url: `https://jiffyscan.xyz/bundle/${hash}?network=arbitrum-sepolia&pageNo=0&pageSize=10`,
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
