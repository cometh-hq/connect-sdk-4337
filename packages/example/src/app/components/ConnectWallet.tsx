import { polygonMumbai } from "viem/chains";
import {
  createSigner,
  signerToKernelSmartAccount,
  ENTRYPOINT_ADDRESS_V06,
} from "@cometh/connect-sdk-4337";
import { createSmartAccountClient } from "permissionless";
import countContractAbi from "../contract/counterABI.json";

import { http, encodeFunctionData, type Hex } from "viem";

const COUNTER_CONTRACT_ADDRESS = "0x84ADD3fa2c2463C8cF2C95aD70e4b5F602332160";
const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;

function ConnectWallet(): JSX.Element {
  if (!apiKey) throw new Error("API key not found");

  const connect = async () => {
    const localStorageAddress = window.localStorage.getItem(
      "walletAddress"
    ) as Hex;

    const signer = await createSigner({
      address: localStorageAddress,
      disableEoaFallback: false,
    });

    console.log({ signer });

    let smartAccount;

    if (localStorageAddress) {
      smartAccount = await signerToKernelSmartAccount({
        comethSigner: signer,
        apiKey,
        rpcUrl: "https://polygon-mumbai-bor-rpc.publicnode.com",
        address: localStorageAddress,
        entryPoint: ENTRYPOINT_ADDRESS_V06,
        disableEoaFallback: false,
      });
    } else {
      smartAccount = await signerToKernelSmartAccount({
        comethSigner: signer,
        apiKey,
        rpcUrl: "https://polygon-mumbai-bor-rpc.publicnode.com",
        entryPoint: ENTRYPOINT_ADDRESS_V06,
        disableEoaFallback: false,
      });
      window.localStorage.setItem("walletAddress", smartAccount.address);
    }

    const smartAccountClient = createSmartAccountClient({
      account: smartAccount,
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

    console.log(txHash);
  };
  return (
    <>
      <button onClick={connect}>connect</button>
    </>
  );
}

export default ConnectWallet;