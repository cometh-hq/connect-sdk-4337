"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import {
    http,
    createPublicClient,
    encodeFunctionData,
    getContract,
} from "viem";
import { gnosis } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

const publicClient = createPublicClient({
    chain: gnosis,
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
    smartAccount: any;
    transactionSuccess: boolean;
    setTransactionSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

function Transaction({
    smartAccount,
    transactionSuccess,
    setTransactionSuccess,
}: TransactionProps) {
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
                )}{" "}
                {label}
            </button>
        );
    }

    useEffect(() => {
        if (smartAccount) {
            (async () => {
                const balance = await counterContract.read.counters([
                    smartAccount.account.address,
                ]);
                setNftBalance(Number(balance));
            })();
        }
    }, []);

    const sendTestTransaction = async (action: () => Promise<void>) => {
        setTransactionSended(null);
        setTransactionFailure(false);
        setTransactionSuccess(false);

        setIsTransactionLoading(true);
        try {
            if (!smartAccount) throw new Error("No wallet instance");

            await action();

            const balance = await counterContract.read.counters([
                smartAccount.account.address,
            ]);
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
                <div className="relative flex flex-col items-center gap-y-6 rounded-lg p-4">
                    <TransactionButton
                        sendTestTransaction={() =>
                            sendTestTransaction(async () => {
                                if (!smartAccount)
                                    throw new Error("No wallet instance");
                                const response =
                                    await smartAccount.setupCustomDelayModule({
                                        guardianAddress:
                                            "0x3DC29f7394Bd83fC99058e018426eB8724629fC6",
                                        expiration: 3800,
                                        coldown: 40800,
                                    });

                                console.log("Setup Delay Module:", response);
                            })
                        }
                        isTransactionLoading={isTransactionLoading}
                        label="Setup Delay Module"
                    />
                    <TransactionButton
                        sendTestTransaction={() =>
                            sendTestTransaction(async () => {
                                if (!smartAccount)
                                    throw new Error("No wallet instance");
                                console.log({ smartAccount });
                                const response =
                                    await smartAccount.getDelayModuleAddress({
                                        expiration: 3800,
                                        cooldown: 40800,
                                    });
                                console.log("Delay Module Address:", response);
                            })
                        }
                        isTransactionLoading={isTransactionLoading}
                        label="Get Delay Module Address"
                    />
                    {/*    <TransactionButton
            sendTestTransaction={() =>
              sendTestTransaction(async () => {
                const walletAdaptor = new ConnectAdaptor({
                  chainId,
                  apiKey,
                  baseUrl,
                });

                if (!wallet) throw new Error("No wallet instance");
                const response = await walletAdaptor.initRecoveryRequest("0xA8eFb84C7B75837C1a2Fc4a0a81d586754b92EC8", "passkey", 3600, 84600)
                console.log("Init Recovery Request:", response)
              })
            }
            isTransactionLoading={isTransactionLoading}
            label="Init Recovery Request"
          /> */}
                    <TransactionButton
                        sendTestTransaction={() =>
                            sendTestTransaction(async () => {
                                if (!smartAccount)
                                    throw new Error("No wallet instance");
                                const response =
                                    await smartAccount.getRecoveryRequest({
                                        effectiveDelayAddress:
                                            "0xBB175c11d88581b9cd1C5d0d274145837f0a3b2B",
                                    });
                                console.log(
                                    "Current Recovery Params:",
                                    response
                                );
                            })
                        }
                        isTransactionLoading={isTransactionLoading}
                        label="Get Current Recovery Params"
                    />
                    <TransactionButton
                        sendTestTransaction={() =>
                            sendTestTransaction(async () => {
                                if (!smartAccount)
                                    throw new Error("No wallet instance");
                                const response =
                                    await smartAccount.getGuardianAddress({
                                        delayModuleAddress:
                                            "0xBB175c11d88581b9cd1C5d0d274145837f0a3b2B",
                                    });
                                console.log("Guardian Address:", response);
                            })
                        }
                        isTransactionLoading={isTransactionLoading}
                        label="Get Guardian Address"
                    />
                    <TransactionButton
                        sendTestTransaction={() =>
                            sendTestTransaction(async () => {
                                if (!smartAccount)
                                    throw new Error("No wallet instance");
                                const response = await smartAccount.addGuardian(
                                    {
                                        delayModuleAddress:
                                            "0xBB175c11d88581b9cd1C5d0d274145837f0a3b2B",
                                        guardianAddress:
                                            "0x3DC29f7394Bd83fC99058e018426eB8724629fC6",
                                    }
                                );
                                console.log("Guardian Address:", response);
                            })
                        }
                        isTransactionLoading={isTransactionLoading}
                        label="Add Guardian"
                    />
                    <TransactionButton
                        sendTestTransaction={() =>
                            sendTestTransaction(async () => {
                                if (!smartAccount)
                                    throw new Error("No wallet instance");
                                const response =
                                    await smartAccount.disableGuardian({
                                        guardianAddress:
                                            "0x3DC29f7394Bd83fC99058e018426eB8724629fC6",
                                        expiration: 3800,
                                        coldown: 40800,
                                    });
                                console.log("Guardian Address:", response);
                            })
                        }
                        isTransactionLoading={isTransactionLoading}
                        label="Disable Guardian"
                    />

                    <TransactionButton
                        sendTestTransaction={() =>
                            sendTestTransaction(async () => {
                                if (!smartAccount)
                                    throw new Error("No wallet instance");

                                const calldata = encodeFunctionData({
                                    abi: countContractAbi,
                                    functionName: "count",
                                });

                                const txHash =
                                    await smartAccount.sendTransaction({
                                        to: COUNTER_CONTRACT_ADDRESS,
                                        data: calldata,
                                    });

                                setTransactionSended(txHash);
                            })
                        }
                        isTransactionLoading={isTransactionLoading}
                        label="Send tx"
                    />

                    <p className=" text-gray-600">{nftBalance}</p>
                </div>
            </div>

            {transactionSuccess && (
                <Alert
                    state="success"
                    content="Transaction confirmed !"
                    link={{
                        content: "Go see your transaction",
                        url: `https://jiffyscan.xyz/bundle/${transactionSended}?network=arbitrum-sepolia&pageNo=0&pageSize=10`,
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
