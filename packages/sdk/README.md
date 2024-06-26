# Nexus Wallet SDK

This SDK help any dApps to get a smoother UX for your end-users (contro a wallet with biometrics, pay for his gas fees, social recovery...)

## Installation

```bash
bun add viem @cometh/connect-sdk-4337
```

## Setup

```ts
import { ENTRYPOINT_ADDRESS_V07, createComethPaymasterClient, createSafeSmartAccount, createSmartAccountClient } from "@cometh/connect-sdk-4337";
import { arbitrumSepolia } from "viem/chains";

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;

const smartAccount = await createSafeSmartAccount({
    apiKey,
    entryPoint: ENTRYPOINT_ADDRESS_V07 ,
})

const paymasterClient = await createComethPaymasterClient({
    transport: http(bundlerUrl),
    chain: arbitrumSepolia,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
})

const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    chain: arbitrumSepolia,
    bundlerTransport: http(bundlerUrl),
    middleware: {
        sponsorUserOperation: paymasterClient.sponsorUserOperation,
        gasPrice: paymasterClient.gasPrice,
    }
}) 

```

## Send transaction

Sample code to watch the current user wallet status:

```ts
import { smartAccountClient } from "./client";
import countContractAbi from "../contract/counterABI.json";

const calldata = encodeFunctionData({
    abi: countContractAbi,
    functionName: "count",
});
  
const txHash =  await smartAccount.sendTransaction({
    to: COUNTER_CONTRACT_ADDRESS,
    data: calldata,
});

```

## Send batch transactions

Sample code to watch the current user wallet status:

```ts
import { smartAccountClient } from "./client";
import countContractAbi from "../contract/counterABI.json";

const calldata = encodeFunctionData({
    abi: countContractAbi,
    functionName: "count",
});
  
const txHash =  await smartAccount.sendTransactions({
    transactions: [
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

Sample code to watch the current user wallet status:

```ts
import { smartAccountClient } from "./client";

const owners = await smartAccountClient.getOwners()

const enrichedOwners = await smartAccountClient.getEnrichedOwners()

await smartAccountClient.addOwner({ownerToAdd:OWNER_ADDRESS_TO_ADD})

await smartAccountClient.removeOwner({ownerToRemove:OWNER_ADDRESS_TO_REMOVE})

```

