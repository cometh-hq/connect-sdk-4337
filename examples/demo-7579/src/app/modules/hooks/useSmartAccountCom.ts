"use client";

import {
    type CreateSessionDataParams,
    applyDefaults,
    getPermissionAction,
} from "@biconomy/sdk";
import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
    createSmartAccountClient,
    toSmartSessionsSigner,
} from "@cometh/connect-sdk-7579";
import {
    MOCK_ATTESTER_ADDRESS,
    OWNABLE_VALIDATOR_ADDRESS,
    RHINESTONE_ATTESTER_ADDRESS,
    type Session,
    SmartSessionMode,
    encodeSmartSessionSignature,
    encodeValidationData,
    encodeValidatorNonce,
    getAccount,
    getClient,
    getEnableSessionDetails,
    getEnableSessionsAction,
    getOwnableValidator,
    getOwnableValidatorMockSignature,
    getPermissionId,
    getSmartSessionsValidator,
    getSudoPolicy,
    getTrustAttestersAction,
} from "@rhinestone/module-sdk";
import { getAccountNonce } from "permissionless/actions";
import { useState } from "react";
import {
    http,
    type Address,
    type Hex,
    type PublicClient,
    createPublicClient,
    toBytes,
    toFunctionSelector,
    toHex,
} from "viem";
import {
    entryPoint07Address,
    getUserOperationHash,
} from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export function useSmartAccount() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const [smartAccount, setSmartAccount] = useState<any | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_COMETH_API_KEY;
    const bundlerUrl = process.env.NEXT_PUBLIC_4337_BUNDLER_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_4337_PAYMASTER_URL;

    function displayError(message: string) {
        setConnectionError(message);
    }

    async function connect() {
        if (!apiKey) throw new Error("API key not found");
        if (!bundlerUrl) throw new Error("Bundler Url not found");

        setIsConnecting(true);
        try {
            const localStorageAddress = window.localStorage.getItem(
                "walletAddress"
            ) as Hex;

            console.log({ localStorageAddress });

            let smartAccount;

            // const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

            const privateKey = generatePrivateKey() as Hex;

            const owner = privateKeyToAccount(privateKey);

            const comethSigner = {
                eoaFallback: {
                    signer: owner,
                    privateKey,
                },

                type: "localWallet",
            };

            if (localStorageAddress) {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: baseSepolia,
                    smartAccountAddress: localStorageAddress,
                    signer: comethSigner,
                });
            } else {
                smartAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: baseSepolia,
                    signer: comethSigner,
                });
                window.localStorage.setItem(
                    "walletAddress",
                    smartAccount.address
                );
            }

            const paymasterClient = await createComethPaymasterClient({
                transport: http(paymasterUrl),
                chain: baseSepolia,
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                chain: baseSepolia,
                bundlerTransport: http(bundlerUrl),
                paymaster: paymasterClient,
                userOperation: {
                    estimateFeesPerGas: async () => {
                        return await paymasterClient.getUserOperationGasPrice();
                    },
                },
            });

            console.log({ smartAccountClient });

            try {
                const hash = await smartAccountClient.trustAttesters();

                const userOpReceipt =
                    await smartAccountClient.waitForUserOperationReceipt({
                        hash,
                    });

                const sessionOwner = privateKeyToAccount(generatePrivateKey());

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
                                ) as Hex, // addBalance function selector
                            },
                        ],
                    },
                ];

                console.log({ sessionRequestedInfo });

                const createSessionsResponse =
                    await smartAccountClient.grantPermission({
                        sessionRequestedInfo,
                    });

                const permissionId = createSessionsResponse.permissionIds[0];

                const receipt =
                    await smartAccountClient.waitForUserOperationReceipt({
                        hash: createSessionsResponse.userOpHash,
                    });

                const sessionKeySigner= await toSmartSessionsSigner(
                    smartAccountClient,
                    { permissionId, signer: sessionOwner }
                );

                console.log({ sessionKeySigner });

                const sessionKeyAccount = await createSafeSmartAccount({
                    apiKey,
                    chain: baseSepolia,
                    smartAccountAddress: localStorageAddress,
                    signer: owner,
                    sessionKeySigner,
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

    

                const hash2 = await sessionKeyClient.usePermission({
                    actions: [
                        {
                            target: COUNTER_CONTRACT_ADDRESS,
                            value: 0n,
                            callData: toFunctionSelector("function count()"),
                        },
                    ],
                });

                console.log({ hash2 });

                const userOpReceipt2 =
                    await smartAccountClient.waitForUserOperationReceipt({
                        hash: hash2,
                    }); 
  
            } catch (e) {
                console.log(e);
            }

            setSmartAccount(smartAccountClient);
            setIsConnected(true);
        } catch (e) {
            displayError((e as Error).message);
        } finally {
            setIsConnecting(false);
        }
    }

    return {
        smartAccount,
        connect,
        isConnected,
        isConnecting,
        connectionError,
        newSigner,
        setNewSigner,
        setConnectionError,
    };
}
