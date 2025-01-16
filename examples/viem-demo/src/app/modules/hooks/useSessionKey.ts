"use client";

import {
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
    toSmartSessionsSigner,
    type ComethSmartAccountClient,
    type CreateSessionDataParams,
    smartSessionActions,
    erc7579Actions
} from "@cometh/connect-sdk-4337";
import {
    OWNABLE_VALIDATOR_ADDRESS,
    SMART_SESSIONS_ADDRESS,
    SmartSessionMode,
    encodeValidationData,
} from "@rhinestone/module-sdk";
import { useState } from "react";
import { type Address, encodeFunctionData, type Hex, http, stringify, toFunctionSelector } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import countContractAbi from "../../contract/counterABI.json";


export function parse(data: string): Record<string, any> {
    return JSON.parse(data, (_, value) => {
        if (value && typeof value === "object" && value.__type === "bigint") {
            return BigInt(value.value)
        }
        return value
    })
}

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export function useSessionKey() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [sessionKeyClient, setSessionKeyClient] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

    const getSessionKey = async ({
        smartAccountClient,
    }: {
        smartAccountClient: ComethSmartAccountClient;
    }) => {
        const stringifiedSessionData = (localStorage.getItem(
            `session-key-${smartAccountClient?.account?.address}`
        )!);

        const extendedAccount = smartAccountClient.extend(smartSessionActions()).extend(erc7579Actions())

        console.log({ extendedAccount })

        const isModuleInstalled = await extendedAccount.isModuleInstalled({ type: "executor", address: "0x00000000002B0eCfbD0496EE71e01257dA0E37DE" as Address, context: "0x" })

        console.log({ isModuleInstalled })

        const privateKey = generatePrivateKey();
        const sessionOwner = privateKeyToAccount(privateKey);

        let sessionKeySigner

        const usersSessionData = parse(stringifiedSessionData) as any

        if (!usersSessionData) {


            console.log({ sessionOwner });



            const createSessionsResponse =
                await extendedAccount.grantPermission({
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

            console.log({ createSessionsResponse })


            const { success: sessionCreateSuccess } = await extendedAccount.waitForUserOperationReceipt({
                hash: createSessionsResponse.userOpHash,
            });


            console.log({ sessionCreateSuccess })

            const sessionData = {
                granter: smartAccountClient?.account?.address as Address,
                privateKey: privateKey,
                sessionPublicKey: sessionOwner.address,
                description: `Session to increment a counter`,
                moduleData: {
                    permissionIds: createSessionsResponse.permissionIds,
                    action: createSessionsResponse.action,
                    mode: SmartSessionMode.USE,
                    sessions: createSessionsResponse.sessions
                }
            }

            const permissionId = createSessionsResponse.permissionIds[0];

            console.log({ permissionId })

            const sessionParams = stringify(sessionData);

            localStorage.setItem(
                `session-key-${smartAccountClient?.account?.address}`,
                sessionParams
            );

            sessionKeySigner = await toSmartSessionsSigner(
                extendedAccount,
                { moduleData: sessionData.moduleData, signer: privateKeyToAccount(usersSessionData.privateKey) }
            )
        }



        console.log({ sessionKeySigner })

        const sessionKeyAccount = await createSafeSmartAccount({
            apiKey,
            chain: baseSepolia,
            smartAccountAddress: smartAccountClient?.account?.address,
            sessionKeySigner,
        });

        const paymasterClient = await createComethPaymasterClient({
            transport: http(paymasterUrl),
            chain: baseSepolia,
        });

        const sessionKeyClient = createSmartAccountClient({
            account: sessionKeyAccount,
            chain: baseSepolia,
            bundlerTransport: http(bundlerUrl),
            paymaster: paymasterClient,
            userOperation: {
                estimateFeesPerGas: async () => {
                    return await paymasterClient.getUserOperationGasPrice();
                },
            },
        });


        const calldata = encodeFunctionData({
            abi: countContractAbi,
            functionName: "count",
        });

        const hash = await sessionKeyClient.sendTransaction({ to: COUNTER_CONTRACT_ADDRESS, data: calldata })


    };

    return {
        sessionKeyClient,
        getSessionKey,
        isConnected,
        isConnecting,
        connectionError,
        newSigner,
        setNewSigner,
        setConnectionError,
    };
}
