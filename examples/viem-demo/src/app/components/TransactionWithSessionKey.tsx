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
import { baseSepolia } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

import {
  createComethPaymasterClient,
  createSafeSmartAccount,
  createSmartAccountClient,
  smartSessionActions,
} from "@cometh/connect-sdk-4337";
import { useSessionKey } from "../modules/hooks/useSessionKey";

export const COUNTER_CONTRACT_ADDRESS =
  "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

const publicClient = createPublicClient({
  chain: baseSepolia,
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

function TransactionWithSessionKey({
  smartAccount,
  transactionSuccess,
  setTransactionSuccess,
}: TransactionProps) {
  const [isTransactionLoading, setIsTransactionLoading] =
    useState<boolean>(false);
  const [transactionSended, setTransactionSended] = useState<any | null>(null);
  const [transactionFailure, setTransactionFailure] = useState(false);
  const [nftBalance, setNftBalance] = useState<number>(0);

  const { getSessionKeySigner } = useSessionKey();

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

                const is7559 = await smartAccount.is7579Installed();

                if (!is7559) {
                  await smartAccount.setFallbackTo7579();
                  return;
                }

                const sessionKeySigner = await getSessionKeySigner({
                  smartAccountClient: smartAccount,
                });

                const sessionKeyAccount = await createSafeSmartAccount({
                  apiKey,
                  chain: baseSepolia,
                  smartAccountAddress: smartAccount?.account?.address,
                  smartSessionSigner: sessionKeySigner,
                });

                const paymasterClient = await createComethPaymasterClient({
                  transport: http(paymasterUrl),
                  chain: baseSepolia,
                });

                const sessionKeyClient = createSmartAccountClient({
                  account: sessionKeyAccount,
                  chain: baseSepolia,
                  bundlerTransport: http(bundlerUrl),
                  paymaster: paymasterClient,
                  userOperation: {
                    estimateFeesPerGas: async () => {
                      return await paymasterClient.getUserOperationGasPrice();
                    },
                  },
                }).extend(smartSessionActions());

                const calldata = encodeFunctionData({
                  abi: countContractAbi,
                  functionName: "count",
                });

                const hash = await sessionKeyClient.usePermission({
                  actions: [
                    {
                      target: COUNTER_CONTRACT_ADDRESS,
                      callData: calldata,
                      value: BigInt(0),
                    },
                  ],
                });
                setTransactionSended(hash);
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

export default TransactionWithSessionKey;
