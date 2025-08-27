# Cometh Connect SDK

This SDK help any dApps to get a smoother UX for your end-users (control a wallet with biometrics, pay for his gas fees, social recovery...)

## Installation

```bash
bun add viem @cometh/connect-sdk-4337
```

## NPM publication

```bash
//go to the root of the selected package and run
bun format

bun build

//for prod version
npm publish

// for dev version
npm publish --tag dev
```

## Setup

```ts
import {
  createComethPaymasterClient,
  createSafeSmartAccount,
  createSmartAccountClient,
} from "@cometh/connect-sdk-4337";
import { arbitrumSepolia } from "viem/chains";
import { http } from "viem";

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;

const smartAccount = await createSafeSmartAccount({
  apiKey,
  entryPoint: ENTRYPOINT_ADDRESS_V07,
});

const paymasterClient = await createComethPaymasterClient({
  transport: http(paymasterUrl),
  chain,
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

## Send batch transactions

```ts
import { smartAccountClient } from "./client";
import countContractAbi from "../contract/counterABI.json";

const calldata = encodeFunctionData({
  abi: countContractAbi,
  functionName: "count",
});

const txHash = await smartAccountClient.sendUserOperation({
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
```

## Handle owners

```ts
import { smartAccountClient } from "./client";

// get owners
const owners = await smartAccountClient.getOwners();

// get enriched owners (with passkey credentials)
const enrichedOwners = await smartAccountClient.getEnrichedOwners();

// add a new owner
await smartAccountClient.addOwner({ ownerToAdd: OWNER_ADDRESS_TO_ADD });

// remove an owner
await smartAccountClient.removeOwner({
  ownerToRemove: OWNER_ADDRESS_TO_REMOVE,
});
```
