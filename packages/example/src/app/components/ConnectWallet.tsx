import { polygonMumbai, sepolia } from "viem/chains";
import { createSmartAccount } from "@cometh/connect-sdk-4337";
import {
  createSmartAccountClient,
  ENTRYPOINT_ADDRESS_V06,
} from "permissionless";
import countContractAbi from "../contract/counterABI.json";

import { http, encodeFunctionData } from "viem";

const COUNTER_CONTRACT_ADDRESS = "0x84ADD3fa2c2463C8cF2C95aD70e4b5F602332160";
const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;

function ConnectWallet(): JSX.Element {
  if (!apiKey) throw new Error("API key not found");

  const connect = async () => {
    const localStorageAddress = window.localStorage.getItem(
      "walletAddress"
    ) as `0x${string}`;
    /* 
    let wallet;

    if (localStorageAddress) {
      wallet = await createSmartAccount({
        apiKey,
        walletAddress: localStorageAddress,
        disableEoaFallback: false,
      });
    } else {
      wallet = await createSmartAccount({
        apiKey,
        disableEoaFallback: false,
      });
      window.localStorage.setItem("walletAddress", wallet.address);
    }

    const smartAccountClient = createSmartAccountClient({
      account: wallet,
      entryPoint: ENTRYPOINT_ADDRESS_V06,
      chain: polygonMumbai,
      bundlerTransport: http("https://mumbai.bundler.develop.core.cometh.tech"),
    });

    console.log(smartAccountClient);

    const calldata = encodeFunctionData({
      abi: countContractAbi,
      functionName: "count",
    });

    const txHash = await smartAccountClient.sendTransaction({
      to: COUNTER_CONTRACT_ADDRESS,
      data: calldata,
    });

    console.log(txHash); */
  };
  return (
    <>
      <button onClick={connect}>connect</button>
    </>
  );
}

export default ConnectWallet;
