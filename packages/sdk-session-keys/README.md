# Session Keys SDK

The **Session Keys SDK** provides an implementation of ERC-7579-compliant Session Keys for use with Safe Accounts. It enables easy registration, revocation, and configuration of session key permissions.

## 📦 Installation

```bash
bun add @cometh/session-keys viem
```

## Tutorial

### 1 - Create a Session Key

```bash
import type { Address, PublicClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
    erc7579Actions,
    smartSessionActions,
    type SafeSigner,
} from "@cometh/session-keys";
import { isSmartAccountDeployed } from "permissionless";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";


const safe7559Account = smartAccountClient.extend(smartSessionActions())
            .extend(erc7579Actions());

const privateKey = generatePrivateKey();
const sessionOwner = privateKeyToAccount(privateKey);

 if (!(await isSmartAccountDeployed(
     smartAccountClient.account?.client as PublicClient, 
     smartAccountClient?.account?.address as Address,
 ))) {
     safe7559Account.addSafe7579Module()
 }
        
const createSessionsResponse = await safe7559Account.grantPermission({
    sessionRequestedInfo: [
        {
            sessionPublicKey: sessionOwner.address,
            actionPoliciesInfo: [
                {
                    contractAddress: COUNTER_CONTRACT_ADDRESS,
                    functionSelector: toFunctionSelector(
                        "function count()"
                    ) as Hex,
                },
            ],
        },
    ],
});

await safe7559Account.waitForUserOperationReceipt({
    hash: createSessionsResponse.userOpHash,
});
```

### 2 - Store the Session Key
In our example, we will store the session key details in local storage. You are free to store it wherever you want.

```bash
import { SmartSessionMode } from "@cometh/session-keys";

const sessionData = {
    granter: smartAccountClient?.account?.address as Address,
    privateKey: privateKey,
    sessionPublicKey: sessionOwner.address,
    description: `Session to increment a counter`,
    moduleData: {
        permissionIds: createSessionsResponse.permissionIds,
        action: createSessionsResponse.action,
        mode: SmartSessionMode.USE,
        sessions: createSessionsResponse.sessions,
    },
};

// This is for example purposes.
const sessionParams = stringify(sessionData);

localStorage.setItem(
    `session-key-${smartAccountClient?.account?.address}`,
    sessionParams
);
```

### 3 - Use the Session Key

```bash
import {
    createComethPaymasterClient,
    createSmartAccountClient,
} from "@cometh/connect-core-sdk";
import {
    toSmartSessionsSigner
    smartSessionActions,
    toSmartSessionsAccount,
} from "@cometh/session-keys";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const apiKey = process.env.COMETH_API_KEY;
const bundlerUrl = process.env.4337_BUNDLER_URL;
const paymasterUrl = process.env.4337_PAYMASTER_URL
const publicClient = createPublicClient({
    chain,
    transport: http(),
});


const stringifiedSessionData = localStorage.getItem(
    `session-key-${WALLETADDRESS}`
);
const sessionData = parse(stringifiedSessionData);

const sessionKeySigner = await toSmartSessionsSigner(safe7559Account, 
{
    moduleData: sessionData.moduleData,
    signer: privateKeyToAccount(sessionData.privateKey),
})

const sessionKeyAccount = await toSmartSessionsAccount(
    smartAccountClient?.account, 
    sessionKeySigner
)

const paymasterClient = await createComethPaymasterClient({
    transport: http(paymasterUrl),
    chain,
});

const sessionKeyClient = createSmartAccountClient({
    account: sessionKeyAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    paymaster: paymasterClient,
    userOperation: {
        estimateFeesPerGas: async () => {
            return await paymasterClient.getUserOperationGasPrice();
        },
    },
}).extend(smartSessionActions());

const callData = encodeFunctionData({
    abi: countContractAbi,
    functionName: "count",
});

const hash = await sessionKeyClient.usePermission({
    actions: [
        {
            target: COUNTER_CONTRACT_ADDRESS,
            callData: callData,
            value: BigInt(0),
        },
    ],
});
```

## Policies

### Sudo
The sudo policy gives full permission to the signer. The signer will be able to send any UserOps.

```bash
const createSessionsResponse = await safe7559Account.grantPermission({
    sessionRequestedInfo: [
        {
            sessionPublicKey: sessionOwner.address,
        },
    ],
});
```

### Action
The action policy limits the target (either contract or EOA) that the UserOp can interact with.

```bash
const createSessionsResponse = await safe7559Account.grantPermission({
    sessionRequestedInfo: [
        {
            sessionPublicKey: sessionOwner.address,
            actionPoliciesInfo: [
                {
                    contractAddress: COUNTER_CONTRACT_ADDRESS,
                    functionSelector: toFunctionSelector(
                        "function count()"
                    ) as Hex,
                },
            ],
        },
    ],
});
```
