import { arbitrumSepolia } from "viem/chains";
import {
  ENTRYPOINT_ADDRESS_V06,
  createSmartAccountClient,
  createModularSmartAccount,
  retrieveAccountAddressFromPasskey,
  useSignerRequests,
  createSigner,
  getPaymasterClient
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
  const [pendingTx, setPendingTx] = useState<boolean>(false);

  const {initNewSignerRequest, getNewSignerRequests} = useSignerRequests(apiKey)

  const connect = async () => {
    setPendingTx(true)
    const localStorageAddress = window.localStorage.getItem(
      "walletAddress"
    ) as Hex;

    //optionnal
    
    const comethSigner = await createSigner({
      apiKey,
      smartAccountAddress: localStorageAddress,
      disableEoaFallback: false,
    }) ;

    let smartAccount;

    if (localStorageAddress) {
      smartAccount = await createModularSmartAccount({
        comethSigner,
        apiKey,
        rpcUrl: "https://arb-sepolia.g.alchemy.com/v2/1I1l-3BakFdYZi3nguZrWu6etwg3KhVY",
        smartAccountAddress: localStorageAddress,
        entryPoint: ENTRYPOINT_ADDRESS_V06,
      });
    } else {
      smartAccount = await createModularSmartAccount({
        comethSigner,
        apiKey,
        rpcUrl: "https://arb-sepolia.g.alchemy.com/v2/1I1l-3BakFdYZi3nguZrWu6etwg3KhVY",
        entryPoint: ENTRYPOINT_ADDRESS_V06,
      });
      window.localStorage.setItem("walletAddress", smartAccount.address);
    }

    const paymasterClient = await getPaymasterClient(apiKey)


    const smartAccountClient = createSmartAccountClient({
      account: smartAccount,
      entryPoint: ENTRYPOINT_ADDRESS_V06,
      chain: arbitrumSepolia,
      bundlerTransport: http(bundlerUrl),
      middleware: {
        sponsorUserOperation: paymasterClient.sponsorUserOperation,
        gasPrice: paymasterClient.gasPrice,
    }
    })



    const calldata = encodeFunctionData({
      abi: countContractAbi,
      functionName: "count",
    });


    const txHash = await smartAccountClient.sendTransaction({
      to: "0x53011E110CAd8685F4911508B4E2413f526Df73E",
      data: "0x00",
 
    });


    setTxHash(txHash)
    setPendingTx(false)
  };

  const retrieveAccount = async() => {
  const walletAddress = await retrieveAccountAddressFromPasskey(apiKey)
  console.log({walletAddress})
  }

  return (
    <>
    
     <button onClick={connect}>{pendingTx ? "loading..." :  "mint"}</button>

     <button onClick={retrieveAccount}>retrieveAccount</button>
      

      {txHash && <a
            href={`https://jiffyscan.xyz/bundle/${txHash}?network=arbitrum-sepolia&pageNo=0&pageSize=10`}
            target="_blank"
            className="flex-none rounded-full bg-gray-900 px-3.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
           Explorer link <span aria-hidden="true">&rarr;</span>
          </a>}

    </>
  );
}

export default ConnectWallet;
