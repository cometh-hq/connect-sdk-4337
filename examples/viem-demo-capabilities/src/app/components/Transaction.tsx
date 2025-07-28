"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import {
    http,
    type Address,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
    smartSessionActions,
    toSmartSessionsSigner,
} from "@cometh/connect-sdk-4337";

import { SmartSessionMode } from "@cometh/connect-sdk-4337";

import { arbitrumSepolia } from "viem/chains";
import countContractAbi from "../contract/counterABI.json";

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

const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY as `0x${string}`;
if (!privateKey) {
    throw new Error("Permission Signer Private key not found in .env");
}

const account = privateKeyToAccount(privateKey);

const counterContract = getContract({
    address: COUNTER_CONTRACT_ADDRESS,
    abi: countContractAbi,
    client: publicClient,
});

interface TransactionProps {
    smartAccount: any;
}

function Transaction({ smartAccount }: TransactionProps) {
    const [testResult, setTestResult] = useState<any>(null);
    const [userOpHash, setUserOpHash] = useState<string>("");

    const testCases = [
        {
            label: "wallet_getCapabilities",
            action: () => smartAccount.getCapabilities(),
        },

        {
            label: "wallet_sendCalls",
            action: async () => {
                const calldata = encodeFunctionData({
                    abi: countContractAbi,
                    functionName: "count",
                });
                const txHash = await smartAccount.sendCalls({
                    calls: [
                        {
                            to: COUNTER_CONTRACT_ADDRESS,
                            value: 0,
                            data: calldata,
                        },
                    ],
                });

                setUserOpHash(txHash);
                return txHash;
            },
        },

        {
            label: "wallet_getCallsStatus",
            action: async () => {
                if (!userOpHash) {
                    throw new Error("Please enter a valid userOp hash.");
                }
                return smartAccount.getCallsStatus({ id: userOpHash });
            },
        },

        {
            label: "wallet_grantPermissions",
            action: async () => {
                const grantParams = {
                    chainId: 421614,
                    signer: {
                        type: "account",
                        data: { address: account.address },
                    },
                    permissions: [
                        {
                            type: "contract-call",
                            data: {
                                contractAddress: COUNTER_CONTRACT_ADDRESS,
                                functionSelector: "function count()",
                            },
                            policies: [],
                        },
                    ],
                    expiry: Math.floor(Date.now() / 1000) + 3600,
                };
                const response =
                    await smartAccount.grantPermissions(grantParams);

                const createSessionsResponse =
                    response.grantedPermissions[0].data;

                const sessionData = {
                    granter: smartAccount?.account?.address as Address,
                    description: `Session to increment a counter`,
                    moduleData: {
                        permissionIds: createSessionsResponse.permissionIds,
                        action: createSessionsResponse.action,
                        mode: SmartSessionMode.USE,
                        sessions: createSessionsResponse.sessions,
                    },
                };

                const sessionParams = JSON.stringify(sessionData, (_, value) =>
                    typeof value === "bigint"
                        ? `0x${value.toString(16)}`
                        : value
                );

                localStorage.setItem(
                    `session-key-${smartAccount?.account?.address}`,
                    sessionParams
                );
                return response;
            },
        },

        {
            label: "test granted wallet",
            action: async () => {
                const calldata = encodeFunctionData({
                    abi: countContractAbi,
                    functionName: "count",
                });

                const WALLETADDRESS = smartAccount?.account?.address as Address;

                const stringifiedSessionData = localStorage.getItem(
                    `session-key-${WALLETADDRESS}`
                );

                if (!stringifiedSessionData) {
                    throw new Error("Session data not found in localStorage");
                }
                const sessionData = JSON.parse(stringifiedSessionData);

                const sessionKeySigner = await toSmartSessionsSigner(
                    smartAccount,
                    {
                        moduleData: sessionData.moduleData,
                        signer: privateKeyToAccount(privateKey),
                    }
                );

                const sessionKeyAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: smartAccount.chain,
                    smartAccountAddress: smartAccount?.account?.address,
                    smartSessionSigner: sessionKeySigner,
                });

                const paymasterClient = await createComethPaymasterClient({
                    transport: http(paymasterUrl),
                    chain: smartAccount.chain,
                });

                const sessionKeyClient = createSmartAccountClient({
                    account: sessionKeyAccount,
                    chain: smartAccount.chain,
                    bundlerTransport: http(bundlerUrl),
                    paymaster: paymasterClient,
                    userOperation: {
                        estimateFeesPerGas: async () => {
                            return await paymasterClient.getUserOperationGasPrice();
                        },
                    },
                }).extend(smartSessionActions());

                const hash = await sessionKeyClient.usePermission({
                    actions: [
                        {
                            target: COUNTER_CONTRACT_ADDRESS,
                            callData: calldata,
                            value: BigInt(0),
                        },
                    ],
                });

                const walletClient = createWalletClient({
                    account,
                    chain: arbitrumSepolia,
                    transport: http(
                        `https://arbitrum-sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`
                    ),
                });

                const txHash = await walletClient.sendTransaction({
                    account,
                    to: COUNTER_CONTRACT_ADDRESS,
                    data: calldata,
                    value: 0n,
                    gas: 100000n,
                });

                const receipt = await publicClient.waitForTransactionReceipt({
                    hash: txHash,
                });

                return { txHash, receipt };
            },
        },
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
                                    console.log(
                                        `####${index + 1}: ${test.label}`,
                                        result
                                    );
                                    setTestResult(result);
                                } catch (error) {
                                    console.error(
                                        `Error in ${test.label}:`,
                                        error
                                    );
                                    setTestResult({ error: error.message });
                                }
                            }}
                        >
                            <PlusIcon width={16} height={16} /> {test.label}
                        </button>
                    ))}

                    {/* UserOp Hash Input for wallet_getCallsStatus */}
                    <input
                        type="text"
                        placeholder="Enter userOp hash..."
                        value={userOpHash}
                        onChange={(e) => setUserOpHash(e.target.value)}
                        className="mt-4 p-2 w-full border rounded-lg text-sm"
                    />

                    {/* Display JSON result */}
                    <pre className="mt-4 p-4 w-full max-h-60 bg-gray-50 rounded-lg text-sm text-gray-800 overflow-auto">
                        {testResult
                            ? JSON.stringify(
                                  testResult,
                                  (_, value) =>
                                      typeof value === "bigint"
                                          ? `0x${value.toString(16)}`
                                          : value,
                                  2
                              )
                            : "Click a button to run a test."}
                    </pre>
                </div>
            </div>
        </main>
    );
}

export default Transaction;
