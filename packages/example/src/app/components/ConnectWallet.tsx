import { arbitrumSepolia } from "viem/chains";
import {
  createSigner,
  ENTRYPOINT_ADDRESS_V06,
  createSmartAccountClient,
  signerToModularSmartAccount,
} from "@cometh/connect-sdk-4337";

import countContractAbi from "../contract/counterABI.json";

import { http, encodeFunctionData, type Hex } from "viem";
import { useState } from "react";

const COUNTER_CONTRACT_ADDRESS = "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";
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
    }) ;



    let smartAccount;

    if (localStorageAddress) {
      smartAccount = await signerToModularSmartAccount({
        comethSigner,
        apiKey,
        rpcUrl: "https://arb-sepolia.g.alchemy.com/v2/1I1l-3BakFdYZi3nguZrWu6etwg3KhVY",
        smartAccountAddress: localStorageAddress,
        entryPoint: ENTRYPOINT_ADDRESS_V06,
      });
    } else {
      smartAccount = await signerToModularSmartAccount({
        comethSigner,
        apiKey,
        rpcUrl: "https://arb-sepolia.g.alchemy.com/v2/1I1l-3BakFdYZi3nguZrWu6etwg3KhVY",
        entryPoint: ENTRYPOINT_ADDRESS_V06,
      });
      window.localStorage.setItem("walletAddress", smartAccount.address);
    }


    const smartAccountClient = createSmartAccountClient({
      account: smartAccount,
      entryPoint: ENTRYPOINT_ADDRESS_V06,
      chain: arbitrumSepolia,
      bundlerTransport: http(bundlerUrl),
    });



    const calldata = encodeFunctionData({
      abi: countContractAbi,
      functionName: "count",
    });


    const txHash = await smartAccountClient.sendTransaction({
      to: COUNTER_CONTRACT_ADDRESS,
      data: calldata,
    });

    setTxHash(txHash)
  };
  return (
    <>
      <button onClick={connect}>connect</button>

      {txHash && <a
            href={`https://jiffyscan.xyz/userOpHash/${txHash}?network=mumbai`}
            target="_blank"
            className="flex-none rounded-full bg-gray-900 px-3.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
           Explorer link <span aria-hidden="true">&rarr;</span>
          </a>}

    </>
  );
}

export default ConnectWallet;
