# Cometh Connect SDK Lite

This Lite version of the Cometh Connect SDK 4337 provides the essential functions for managing smart accounts. It supports various authentication providers such as EOA, Magic, Web3Auth, Turnkey, and Privy, allowing developers to create and interact with smart accounts efficiently.

## Installation

```bash
bun add viem @cometh/connect-core-sdk
```

## Setup

```ts
import {
  createComethPaymasterClient,
  createSafeSmartAccount,
  createSmartAccountClient,
  providerToSmartAccountSigner,
} from "@cometh/connect-core-sdk";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { http } from "viem";

const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

const signer = await providerToSmartAccountSigner(window.ethereum);

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
  cacheTime: 60_000,
  batch: {
    multicall: { wait: 50 },
  },
});
const smartAccount = await createSafeSmartAccount({
  chain: arbitrumSepolia,
  publicClient,
  signer,
});

const paymasterClient = await createComethPaymasterClient({
  transport: http(paymasterUrl),
  chain: arbitrumSepolia,
  publicClient,
});

const smartAccountClient = createSmartAccountClient({
  account: smartAccount,
  chain,
  bundlerTransport: http(bundlerUrl),
  paymaster: paymasterClient,
  userOperation: {
    estimateFeesPerGas: async () => {
      return await paymasterClient.getUserOperationGasPrice();
    },
  },
});
```

## Send transaction

```ts
import { smartAccountClient } from "./client";
import countContractAbi from "../contract/counterABI.json";

const calldata = encodeFunctionData({
  abi: countContractAbi,
  functionName: "count",
});

const txHash = await smartAccountClient.sendTransaction({
  to: COUNTER_CONTRACT_ADDRESS,
  data: calldata,
});
```
