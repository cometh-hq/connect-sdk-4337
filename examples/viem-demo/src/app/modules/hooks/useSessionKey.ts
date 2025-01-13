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
    encodeValidationData,
} from "@rhinestone/module-sdk";
import { useState } from "react";
import { type Address, type Hex, http, toFunctionSelector } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [sessionKeyClient, setSessionKeyClient] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

    const getSessionKey = async ({
        smartAccountAddress,
        smartAccountClient,
    }: {
        smartAccountAddress: Address;
        smartAccountClient: ComethSmartAccountClient;
    }) => {
        const sessionKey = JSON.parse(localStorage.getItem(
            `session-key-${smartAccountAddress}`
        )!);

        const extendedAccount = smartAccountClient.extend(smartSessionActions()).extend(erc7579Actions())

        if (!sessionKey) {
            const privateKey = generatePrivateKey();
            const sessionOwner = privateKeyToAccount(privateKey);

            const sessionRequestedInfo: CreateSessionDataParams[] = [
                {
                    sessionPublicKey: sessionOwner.address,
                    sessionValidatorAddress: OWNABLE_VALIDATOR_ADDRESS,
                    sessionKeyData: encodeValidationData({
                        threshold: 1,
                        owners: [sessionOwner.address],
                    }) as any,
                    actionPoliciesInfo: [
                        {
                            contractAddress: COUNTER_CONTRACT_ADDRESS,
                            functionSelector: toFunctionSelector(
                                "function count()"
                            ) as Hex, 
                        },
                    ],
                },
            ];

            const createSessionsResponse =
                await extendedAccount.grantPermission({
                    sessionRequestedInfo,
                });

            await extendedAccount.waitForUserOperationReceipt({
                hash: createSessionsResponse.userOpHash,
            });

            const permissionId = createSessionsResponse.permissionIds[0];

            const sessionParams = JSON.stringify({
                privateKey,
                permissionId,
            });

            localStorage.setItem(
                `session-key-${smartAccountAddress}`,
                sessionParams
            );
        }

        const sessionKeySigner = await toSmartSessionsSigner(
            extendedAccount,
            { permissionId: sessionKey.permissionId, signer: privateKeyToAccount(sessionKey.privateKey) }
        );

        const sessionKeyAccount = await createSafeSmartAccount({
            apiKey,
            chain: baseSepolia,
            smartAccountAddress,
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
