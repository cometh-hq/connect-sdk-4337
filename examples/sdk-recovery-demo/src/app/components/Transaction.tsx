"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useState } from "react";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";
import { arbitrumSepolia } from "viem/chains";
import axios from "axios";
import { encodeFunctionData } from "viem";

import counterContractAbi from "../contract/counterABI.json";

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
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const [transactionSended, setTransactionSended] = useState<any | null>(null);
  const [transactionFailure, setTransactionFailure] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY!;
  const delayModuleAddress = process.env.NEXT_PUBLIC_DELAY_MODULE_ADDRESS!;
  const guardianAddress = process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS!;
  const newOwner = process.env.NEXT_PUBLIC_NEW_OWNER!;
  const effectiveDelayAddress = delayModuleAddress;

  const COUNTER_CONTRACT_ADDRESS =
  "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F"; 

  const calldata = encodeFunctionData({
    abi: counterContractAbi,
    functionName: "count",
  });

  async function handleRecoveryAction(action: () => Promise<any>) {
    setTransactionSended(null);
    setTransactionFailure(false);
    setTransactionSuccess(false);
    setIsTransactionLoading(true);
    setTransactionResult(null);

    try {
      if (!smartAccount) throw new Error("No wallet instance");

      const result = await action();
      console.log("Recovery action result:", result);

      setTransactionResult(result);
      setTransactionSended(result?.hash || JSON.stringify(result));
      setTransactionSuccess(true);
    } catch (e) {
      console.error("Recovery action error:", e);
      setTransactionFailure(true);
    }

    setIsTransactionLoading(false);
  }

  function TransactionButton({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) {
    return (
      <button
        className="mt-1 flex h-11 py-2 px-4 gap-2 flex-none items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200"
        onClick={onClick}
      >
        {isTransactionLoading ? (
          <Icons.spinner className="h-4 w-4 animate-spin" />
        ) : (
          <PlusIcon width={16} height={16} />
        )}
        {label}
      </button>
    );
  }

  return (
    <main>
      <div className="p-4 flex flex-col items-center space-y-3">
      <TransactionButton
        label="Start Recovery"
        onClick={() =>
          handleRecoveryAction(async () => {
            const api = axios.create({
              baseURL: "https://api.4337.cometh.io",
            });

            api.defaults.headers.common["apisecret"] =
              process.env.NEXT_PUBLIC_COMETH_API_SECRET!;

            const body = {
              chainId: arbitrumSepolia.id.toString(),
              walletAddress: smartAccount.account.address, 
              newOwner,
            };

            const response = await api.post("/recovery/start", body);
            return response.data;
          })
        }
      />
      <TransactionButton
        label="Finalize Recovery"
        onClick={() =>
          handleRecoveryAction(async () => {
            const api = axios.create({
              baseURL: "https://api.4337.cometh.io",
            });

            api.defaults.headers.common["apisecret"] =
              process.env.NEXT_PUBLIC_COMETH_API_SECRET!;

            const body = {
              chainId: arbitrumSepolia.id.toString(),
              walletAddress: smartAccount.account.address, 
            };

            const response = await api.post("/recovery/finalize", body);
            return response.data;
          })
        }
      />
        <TransactionButton
          label="setUpRecoveryModule"
          onClick={() =>
            handleRecoveryAction(() => smartAccount.setUpRecoveryModule({ apiKey }))
          }
        />
        <TransactionButton
          label="isRecoveryActive"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.isRecoveryActive({ apiKey })
            )
          }
        />
        <TransactionButton
          label="getRecoveryRequest"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.getRecoveryRequest({ apiKey })
            )
          }
        />
        <TransactionButton
          label="cancelRecoveryRequest"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.cancelRecoveryRequest({ apiKey })
            )
          }
        />
        <TransactionButton
          label="getDelayModuleAddress"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.getDelayModuleAddress({
                apiKey,
                cooldown: 3800,
                expiration: 40800,
              })
            )
          }
        />
        <TransactionButton
          label="getGuardianAddress"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.getGuardianAddress({ delayModuleAddress })
            )
          }
        />
        <TransactionButton
          label="addGuardian"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.addGuardian({ delayModuleAddress, guardianAddress })
            )
          }
        />
        <TransactionButton
          label="disableGuardian"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.disableGuardian({ apiKey, guardianAddress, cooldown: 3800, expiration: 40800 })
            )
          }
        />
        <TransactionButton
          label="sendTx"
          onClick={() =>
            handleRecoveryAction(() =>
              smartAccount.sendTransaction({
                to: COUNTER_CONTRACT_ADDRESS,
                data: calldata,
              })
            )
          }
        />
        <TransactionButton
          label="setupCustomDelayModule"
          onClick={() =>
            handleRecoveryAction(() => 
              smartAccount.setupCustomDelayModule({
                apiKey,
                guardianAddress,
                cooldown: 3800,
                expiration: 40800,
              })
            )
          }
        />
      </div>

    
        {transactionSuccess && (
          <Alert
            state="success"
            content="Transaction confirmed!"
            link={
              transactionSended
                ? {
                    content: "Go see your transaction",
                    url: `https://jiffyscan.xyz/bundle/${transactionSended}?network=arbitrum-sepolia`,
                  }
                : undefined
            }
          />
        )}

        {transactionFailure && (
          <Alert state="error" content="Transaction Failed!" />
        )}

      {transactionResult && (
        <div className="p-4 bg-gray-100 border border-gray-300 rounded-md whitespace-pre-wrap text-sm">
          <strong>Result:</strong>
          <pre>
            {JSON.stringify(
              transactionResult,
              (_, value) => (typeof value === "bigint" ? value.toString() : value),
              2
            )}
          </pre>
        </div>
      )}


    </main>
  );
}

export default Transaction;
