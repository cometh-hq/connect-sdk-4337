"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import {
  http,
  createPublicClient,
  encodeFunctionData,
  getContract,
  createWalletClient, 
  parseEther
} from "viem";
import {privateKeyToAccount} from "viem/accounts";

import { arbitrumSepolia } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

export const COUNTER_CONTRACT_ADDRESS = "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

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
  smartAccount: any;
}

function Transaction({ smartAccount }: TransactionProps) {
  const [nftBalance, setNftBalance] = useState<number>(0);
  const [transactionSended, setTransactionSended] = useState<any | null>(null);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionFailure, setTransactionFailure] = useState(false);

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

  const testCases = [

    { label: "eth_chainId", action: () => smartAccount.request({ method: "eth_chainId" }) },

    { label: "eth_requestAccounts", action: () => smartAccount.request({ method: "eth_requestAccounts" }) },

    { label: "eth_accounts", action: () => smartAccount.request({ method: "eth_accounts" }) },

    { label: "eth_sendTransaction", action: async () => {
        const calldata = encodeFunctionData({ abi: countContractAbi, functionName: "count" });
        return smartAccount.request({ method: "eth_sendTransaction", params: [{ from: smartAccount.account.address, to: COUNTER_CONTRACT_ADDRESS, value: 0, data: calldata }] });
      }
    },

    { label: "eth_sign", action: () => smartAccount.request({ method: "eth_sign", params: [smartAccount.account.address, "0xdeadbeef"] }) },

    { label: "personal_sign", action: () => smartAccount.request({ method: "personal_sign", params: ["0xdeadbeef", smartAccount.account.address] }) },

    // { label: "eth_signTypedData", action: () => smartAccount.request({ method: "eth_signTypedData", params: [smartAccount.account.address, JSON.stringify({ message: "Test Data" })] }) },

    // { label: "eth_signTypedData_v4", action: () => smartAccount.request({ method: "eth_signTypedData_v4", params: [smartAccount.account.address, JSON.stringify({ message: "Test Data" })] }) },

    { label: "wallet_getCapabilities", action: () => smartAccount.getCapabilities() },

    { label: "wallet_sendCalls", action: async () => {
        const calldata = encodeFunctionData({ abi: countContractAbi, functionName: "count" });
        return smartAccount.sendCalls({ calls: [{ to: COUNTER_CONTRACT_ADDRESS, value: 0, data: calldata }] });
      }
    },

    { label: "wallet_getCallsStatus", action: async () => {
        const calldata = encodeFunctionData({ abi: countContractAbi, functionName: "count" });
        const txHash = await smartAccount.sendCalls({ calls: [{ to: COUNTER_CONTRACT_ADDRESS, value: 0, data: calldata }] });
        return smartAccount.getCallsStatus({ id: txHash });
      }
    },

    { label: "wallet_grantPermissions", action: async () => {
        const grantParams = {
          chainId: 421614,
          signer: { type: 'account', data: { address: smartAccount.account.address } },
          permissions: [{ type: 'contract-call', data: { contractAddress: COUNTER_CONTRACT_ADDRESS, functionSelector: 'function count()' }, policies: [] }],
          expiry: Math.floor(Date.now() / 1000) + 3600
        };
        return smartAccount.grantPermissions(grantParams);
      }
    },

    { label: "test granted wallet", action: async () => {
      const calldata = encodeFunctionData({ abi: countContractAbi, functionName: "count" });
  
      // Retrieve private key from .env
      const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY as `0x${string}`;
      if (!privateKey) {
        console.error("Private key not found in .env");
        return;
      }
  
      // Create a wallet client with the private key
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        account,
        chain: arbitrumSepolia,
        transport: http(`https://arbitrum-sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`),
      });
  
      // Send the transaction
      const txHash = await walletClient.sendTransaction({
        account,
        to: COUNTER_CONTRACT_ADDRESS,
        data: calldata,
        value: 0n,
        gas: 100000n,
      });

      console.log("Permission Test Tx Hash", txHash);

      // Wait for confirmation
      return publicClient.waitForTransactionReceipt({ hash: txHash });
    }
  },
  

    { label: "wallet_switchEthereumChain", action: () => smartAccount.request({ method: "wallet_switchEthereumChain" }) },

  ];

  return (
    <main>
      <div className="p-4">
        <div className="relative flex flex-col items-center gap-y-6 rounded-lg p-4">
          {testCases.map((test, index) => (
            <button
              key={index}
              className="mt-1 flex h-11 py-2 px-4 gap-2 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={async () => {
                try {
                  const result = await test.action();
                  console.log(`####${index + 1}: ${test.label}`, result);
                } catch (error) {
                  console.error(`Error in ${test.label}:`, error);
                }
              }}
            >
              <PlusIcon width={16} height={16} /> {test.label}
            </button>
          ))}
          <p className="text-gray-600">Balance: {nftBalance}</p>
        </div>
      </div>
    </main>
  );
}

export default Transaction;
