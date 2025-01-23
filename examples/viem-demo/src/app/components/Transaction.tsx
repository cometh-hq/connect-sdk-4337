"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> cd05974 (add: setFallback7579)
=======
>>>>>>> 29ab55c (update: session key)
=======
>>>>>>> b12c29a (update: sessions)
    http,
    createPublicClient,
    encodeFunctionData,
    getContract,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> 5b6160b (update: test)
=======
>>>>>>> f1e56ba (fix: smart account actions)
=======
>>>>>>> c37a37e (update: multicall for first sessionkey)
  http,
  createPublicClient,
  encodeFunctionData,
  getContract,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  parseEther,
>>>>>>> b24c65f (fix: packages)
=======
>>>>>>> a3d712e (up: package)
=======
>>>>>>> cd05974 (add: setFallback7579)
=======
    parseAbi,
>>>>>>> e4491e0 (update: session key)
=======
  parseAbi,
>>>>>>> 5b6160b (update: test)
=======
    parseAbi,
>>>>>>> 29ab55c (update: session key)
=======
  parseAbi,
>>>>>>> f1e56ba (fix: smart account actions)
=======
    parseAbi,
>>>>>>> b12c29a (update: sessions)
=======
>>>>>>> c37a37e (update: multicall for first sessionkey)
} from "viem";
import { baseSepolia } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

export const COUNTER_CONTRACT_ADDRESS =
  "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

const publicClient = createPublicClient({
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> cd05974 (add: setFallback7579)
    chain: arbitrumSepolia,
=======
    chain: baseSepolia,
>>>>>>> 29ab55c (update: session key)
=======
    chain: baseSepolia,
>>>>>>> b12c29a (update: sessions)
    transport: http(),
    cacheTime: 60_000,
    batch: {
        multicall: { wait: 50 },
    },
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> 5b6160b (update: test)
  chain: arbitrumSepolia,
=======
  chain: baseSepolia,
>>>>>>> 279846b (fix: session)
=======
  chain: baseSepolia,
>>>>>>> f1e56ba (fix: smart account actions)
=======
  chain: baseSepolia,
>>>>>>> c37a37e (update: multicall for first sessionkey)
  transport: http(),
  cacheTime: 60_000,
  batch: {
    multicall: { wait: 50 },
  },
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b24c65f (fix: packages)
=======
>>>>>>> cd05974 (add: setFallback7579)
=======
>>>>>>> 5b6160b (update: test)
=======
>>>>>>> 29ab55c (update: session key)
=======
>>>>>>> f1e56ba (fix: smart account actions)
=======
>>>>>>> b12c29a (update: sessions)
=======
>>>>>>> c37a37e (update: multicall for first sessionkey)
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
  const [transactionSended, setTransactionSended] = useState<any | null>(null);
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
                if (!smartAccount) throw new Error("No wallet instance");

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        setIsTransactionLoading(true);
        try {
            if (!smartAccount) throw new Error("No wallet instance");
<<<<<<< HEAD

<<<<<<< HEAD
<<<<<<< HEAD
            await action();
=======
                await smartAccount.estimateGas({
                  calls: [
                    {
                      to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
                      value: parseEther("0"),
                      data: calldata,
                    },
                  ],
                });

=======
>>>>>>> a3d712e (up: package)
                const txHash = await smartAccount.sendTransaction({
                  to: COUNTER_CONTRACT_ADDRESS,
                  data: calldata,
                });
>>>>>>> b24c65f (fix: packages)
=======

            await action();
>>>>>>> cd05974 (add: setFallback7579)

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

                                const calldata = encodeFunctionData({
=======
                /*    const calldata = encodeFunctionData({
>>>>>>> 5b6160b (update: test)
                                    abi: countContractAbi,
                                    functionName: "count",
                                });

                                const smartSessions = getSmartSessionsValidator({});

                                const txHash =
                                    await smartAccount.sendTransaction({
                                        to: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                                        data: encodeFunctionData({
                                            abi: parseAbi([
                                                "struct ModuleInit {address module;bytes initData;}",
                                                "function addSafe7579(address safe7579,ModuleInit[] calldata validators,ModuleInit[] calldata executors,ModuleInit[] calldata fallbacks, ModuleInit[] calldata hooks,address[] calldata attesters,uint8 threshold) external",
                                            ]),
                                            functionName: "addSafe7579",
                                            args: [
                                                "0x7579EE8307284F293B1927136486880611F20002",
                                                [
                                                    {
                                                        module: smartSessions.address,
                                                        initData: smartSessions.initData,
                                                    },
                                                ],
                                                [],
                                                [],
                                                [],
                                                [
                                                    "0x000000333034E9f539ce08819E12c1b8Cb29084d", // Rhinestone Attester
                                                    MOCK_ATTESTER_ADDRESS
                                                ],
                                                1,
                                            ],
                                        }),
                                    });

                                    console.log({txHash}) */
=======
   
>>>>>>> 279846b (fix: session)
=======
        setIsTransactionLoading(true);
        try {
            if (!smartAccount) throw new Error("No wallet instance");
>>>>>>> 29ab55c (update: session key)
=======
=======
>>>>>>> c37a37e (update: multicall for first sessionkey)
                const calldata = encodeFunctionData({
                  abi: countContractAbi,
                  functionName: "count",
                });
<<<<<<< HEAD
>>>>>>> f1e56ba (fix: smart account actions)
=======
        setIsTransactionLoading(true);
        try {
            if (!smartAccount) throw new Error("No wallet instance");
>>>>>>> b12c29a (update: sessions)
=======
>>>>>>> c37a37e (update: multicall for first sessionkey)

                const txHash = await smartAccount.sendTransaction({
                  calls: [
                    {
                      to: COUNTER_CONTRACT_ADDRESS,
                      data: calldata,
                    },
                    {
                      to: COUNTER_CONTRACT_ADDRESS,
                      data: calldata,
                    },
                  ],
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
