"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import {
  http,
  createPublicClient,
  encodeFunctionData,
  getContract,
  parseEther,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";

export const COUNTER_CONTRACT_ADDRESS =
  "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

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

      const calldata = encodeFunctionData({
        abi: countContractAbi,
        functionName: "count",
      });


    console.log("####1: eth_chainId ", await smartAccount.request({ method: "eth_chainId" }))
    console.log("####2: eth_requestAccounts ", await smartAccount.request({ method: "eth_requestAccounts" }))
    console.log("####3: eth_accounts ", await smartAccount.request({ method: "eth_accounts" }))
    console.log("####4: eth_sendTransaction ", await smartAccount.request({ method: "eth_sendTransaction", params: [{ from: smartAccount.account.address, to: COUNTER_CONTRACT_ADDRESS, value: 0, data: calldata }] }))
    console.log("####5: eth_sign ", await smartAccount.request({ method: "eth_sign", params: [smartAccount.account.address, "0xdeadbeef"] }))
    console.log("####6: personal_sign ", await smartAccount.request({ method: "personal_sign", params: ["0xdeadbeef",smartAccount.account.address] }))

    // const typedData = {
    //   account: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    //   domain: { 
    //     name: 'Ether Mail',
    //     version: '1',
    //     chainId: 1,
    //     verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    //   },
    //   types: {
    //     Person: [
    //       { name: 'name', type: 'string' },
    //       { name: 'wallet', type: 'address' },
    //     ],
    //     Mail: [
    //       { name: 'from', type: 'Person' },
    //       { name: 'to', type: 'Person' },
    //       { name: 'contents', type: 'string' },
    //     ],
    //   },
    //   primaryType: 'Mail',
    //   message: {
    //     from: {
    //       name: 'Cow',
    //       wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    //     },
    //     to: {
    //       name: 'Bob',
    //       wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    //     },
    //     contents: 'Hello, Bob!',
    //   },
    // }

    //Method not supported:
    // console.log("####7: eth_signTypedData ", await smartAccount.request({ method: "eth_signTypedData", params: [smartAccount.account.address,JSON.stringify(typedData)] }))
    // console.log("####8: eth_signTypedData_v4 ", await smartAccount.request({ method: "eth_signTypedData_v4", params: [smartAccount.account.address,JSON.stringify(typedData)] }))
   
   
   
   
    console.log("####9: wallet_getCapabilities ", await smartAccount.getCapabilities())  //OK

    const txHash = await smartAccount.sendCalls({calls: [{ to: COUNTER_CONTRACT_ADDRESS, value: 0, data: calldata }]})
    console.log("####10: wallet_sendCalls ", txHash)
    console.log("####11: wallet_getCallsStatus ", await smartAccount.getCallsStatus({id: txHash}))


    const grantParams = [{
      chainId: 421614,
      signer: {
        type: 'account',
        data: {
          address: "0x3DC29f7394Bd83fC99058e018426eB8724629fC6",
        }
      },
      permissions: [
        {
          type: 'contract-call',
          data: {
            contractAddress: COUNTER_CONTRACT_ADDRESS,  
            functionSelector: 'function count()'
          },
        },
      ],
      expiry: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    }]

  const grantPermissions = await smartAccount.request({ method: "wallet_grantPermissions", params: grantParams})
    console.log("####12: wallet_grantPermissions ", grantPermissions)
    
    //console.log("####13", await eip1193Provider.request({ method: "wallet_switchEthereumChain" })) //OK: Error Not Implemented.


      const balance = await counterContract.read.counters([
        smartAccount.account.address,
      ]);
      setNftBalance(Number(balance));
      setTransactionSended(txHash);

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

                const calldata = encodeFunctionData({
                  abi: countContractAbi,
                  functionName: "count",
                });

                const txHash = await smartAccount.sendTransaction({
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
