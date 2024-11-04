"use client";

import { applyDefaults, getPermissionAction } from "@biconomy/sdk";
import {
    ENTRYPOINT_ADDRESS_V07,
    createComethPaymasterClient,
    createSafeSmartAccount,
} from "@cometh/connect-sdk-7579";
import {
    type EnableSession,
    MOCK_ATTESTER_ADDRESS,
    OWNABLE_VALIDATOR_ADDRESS,
    RHINESTONE_ATTESTER_ADDRESS,
    SMART_SESSIONS_ADDRESS,
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
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { getAccountNonce } from "permissionless/actions";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { useState } from "react";
import {
    http,
    type Address,
    type Hex,
    type PublicClient,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    getContract,
    getFunctionSelector,
    hexToBigInt,
    toBytes,
    toFunctionSelector,
    toHex,
} from "viem";
import {
    createPaymasterClient,
    entryPoint07Address,
    getUserOperationHash,
} from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import countContractAbi from "../../contract/counterABI.json";

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

            console.log({ comethSigner });

            const publicClient = createPublicClient({
                transport: http(),
                chain: baseSepolia,
            });

            const pimlicoClient = createPimlicoClient({
                transport: http(bundlerUrl),
                entryPoint: {
                    address: entryPoint07Address,
                    version: "0.7",
                },
            });

            const paymasterClient = createPaymasterClient({
                transport: http(paymasterUrl),
            });

            const sessionOwner = privateKeyToAccount(generatePrivateKey());

            const ownableValidator = getOwnableValidator({
                owners: [owner.address],
                threshold: 1,
            });

            const smartSessions = getSmartSessionsValidator({});

            console.log({ smartSessions });

            const safeAccount = await toSafeSmartAccount({
                client: publicClient,
                owners: [owner],
                version: "1.4.1",
                entryPoint: {
                    address: entryPoint07Address,
                    version: "0.7",
                },
                safe4337ModuleAddress:
                    "0x7579F9feedf32331C645828139aFF78d517d0001",
                erc7579LaunchpadAddress:
                    "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                attesters: [
                    RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
                    MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
                ],
                attestersThreshold: 1,
                validators: [
                    {
                        address: smartSessions.address,
                        context: smartSessions.initData,
                    },
                ],
            });

            console.log({ safeAccount });

            const smartAccountClient = createSmartAccountClient({
                account: safeAccount,
                chain: baseSepolia,
                bundlerTransport: http(bundlerUrl),
                paymaster: paymasterClient,
                userOperation: {
                    estimateFeesPerGas: async () => {
                        return (await pimlicoClient.getUserOperationGasPrice())
                            .fast;
                    },
                },
            }).extend(erc7579Actions());

            const session: Session = {
                sessionValidator: safeAccount.address,
                sessionValidatorInitData: encodeValidationData({
                    threshold: 1,
                    owners: [sessionOwner.address],
                }),
                salt: toHex(toBytes("0", { size: 32 })),
                userOpPolicies: [],
                erc7739Policies: {
                    allowedERC7739Content: [],
                    erc1271Policies: [],
                },
                actions: [
                    {
                        actionTarget: COUNTER_CONTRACT_ADDRESS as Address, // an address as the target of the session execution
                        actionTargetSelector: toFunctionSelector(
                            "function count()"
                        ) as Hex, // function selector to be used in the execution, in this case no function selector is used
                        actionPolicies: [getSudoPolicy()],
                    },
                ],
                chainId: BigInt(baseSepolia.id),
            };
            const enableSessionAction = getEnableSessionsAction({
                sessions: [session],
            });

            console.log({ enableSessionAction });

            console.log({ smartAccountClient });

            try {
                const trustAttestersAction = getTrustAttestersAction({
                    threshold: 1,
                    attesters: [
                        RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
                        MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
                    ],
                });

                const userOpHash1 = await smartAccountClient.sendUserOperation({
                    account: safeAccount,
                    calls: [
                        {
                            to: trustAttestersAction.target,
                            value: BigInt(0),
                            data: trustAttestersAction.data,
                        },
                    ],
                });

                await pimlicoClient.waitForUserOperationReceipt({
                    hash: userOpHash1,
                });

                const sessionRequestedInfo: any = [
                    {
                        sessionPublicKey: sessionOwner.address,
                        sessionValidatorAddress: OWNABLE_VALIDATOR_ADDRESS,
                        sessionKeyData: encodeValidationData({
                            threshold: 1,
                            owners: [sessionOwner.address],
                        }),
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

                const defaultedSessionRequestedInfo =
                    sessionRequestedInfo.map(applyDefaults);

                const actionResponse = await getPermissionAction({
                    chainId: smartAccountClient.chain.id,
                    client: publicClient as PublicClient,
                    sessionRequestedInfo: defaultedSessionRequestedInfo,
                });

                console.log({ actionResponse });

                if ("action" in actionResponse) {
                    const { action, permissionIds } = actionResponse;
                    if (!("callData" in action)) {
                        throw new Error("Error getting enable sessions action");
                    }

                    const userOpHash2 =
                        await smartAccountClient.sendUserOperation({
                            account: safeAccount,
                            calls: [
                                {
                                    to: action.target,
                                    value: action.value,
                                    data: action.callData,
                                },
                            ],
                        });

                    console.log({ userOpHash2 });

                    await pimlicoClient.waitForUserOperationReceipt({
                        hash: userOpHash2,
                    });

                    const isPermissionInstalled =
                        await publicClient.readContract({
                            address: SMART_SESSIONS_ADDRESS,
                            abi: [
                                {
                                    type: "function",
                                    name: "isPermissionEnabled",
                                    inputs: [
                                        {
                                            name: "permissionId",
                                            type: "bytes32",
                                            internalType: "PermissionId",
                                        },
                                        {
                                            name: "account",
                                            type: "address",
                                            internalType: "address",
                                        },
                                    ],
                                    outputs: [
                                        {
                                            name: "",
                                            type: "bool",
                                            internalType: "bool",
                                        },
                                    ],
                                    stateMutability: "view",
                                },
                            ],
                            functionName: "isPermissionEnabled",
                            args: [permissionIds[0], safeAccount.address],
                        });

                    console.log({ isPermissionInstalled });

                    const nonce = await getAccountNonce(publicClient, {
                        address: safeAccount.address,
                        entryPointAddress: entryPoint07Address,
                        key: encodeValidatorNonce({
                            account: getAccount({
                                address: safeAccount.address,
                                type: "safe",
                            }),
                            validator: smartSessions,
                        }),
                    });

                    const sessionDetails = {
                        mode: SmartSessionMode.USE,
                        permissionId: permissionIds[0],
                        signature: getOwnableValidatorMockSignature({
                            threshold: 1,
                        }),
                    };

                    const userOperation =
                        await smartAccountClient.prepareUserOperation({
                            account: safeAccount,
                            calls: [
                                {
                                    to: session.actions[0].actionTarget,
                                    value: BigInt(0),
                                    data: session.actions[0]
                                        .actionTargetSelector,
                                },
                            ],
                            nonce,
                            signature:
                                encodeSmartSessionSignature(sessionDetails),
                        });

                    console.log({ userOperation });

                    const userOpHashToSign = getUserOperationHash({
                        chainId: smartAccountClient.chain.id,
                        entryPointAddress: entryPoint07Address,
                        entryPointVersion: "0.7",
                        userOperation,
                    });

                    sessionDetails.signature = await sessionOwner.signMessage({
                        message: { raw: userOpHashToSign },
                    });

                    userOperation.signature =
                        encodeSmartSessionSignature(sessionDetails);

                    const userOpHash =
                        await smartAccountClient.sendUserOperation(
                            userOperation
                        );

                    const receipt =
                        await pimlicoClient.waitForUserOperationReceipt({
                            hash: userOpHash,
                        });

                    const counterContract = getContract({
                        address: COUNTER_CONTRACT_ADDRESS,
                        abi: countContractAbi,
                        client: publicClient,
                    });

                    console.log(
                        await counterContract.read.counters([
                            safeAccount.address,
                        ])
                    );
                }

                const account = getAccount({
                    address: safeAccount.address,
                    type: "safe",
                });

                /*  const sessionDetails = await getEnableSessionDetails({
                    sessions: [session],
                    account,
                    clients: [publicClient as any],
                });

                sessionDetails.enableSessionData.enableSession.permissionEnableSig =
                    await owner.signMessage({
                        message: { raw: sessionDetails.permissionEnableHash },
                    });

                const nonce = await getAccountNonce(publicClient, {
                    address: safeAccount.address,
                    entryPointAddress: entryPoint07Address,
                    key: encodeValidatorNonce({
                        account,
                        validator: smartSessions,
                    }),
                });

                sessionDetails.signature = getOwnableValidatorMockSignature({
                    threshold: 1,
                });

                const userOperation =
                    await smartAccountClient.prepareUserOperation({
                        account: safeAccount,
                        calls: [
                            {
                                to: session.actions[0].actionTarget,
                                value: BigInt(0),
                                data: session.actions[0].actionTargetSelector,
                            },
                        ],
                        nonce,
                        signature: encodeSmartSessionSignature(sessionDetails),
                    });

                const userOpHashToSign = getUserOperationHash({
                    chainId: baseSepolia.id,
                    entryPointAddress: entryPoint07Address,
                    entryPointVersion: "0.7",
                    userOperation,
                });

                sessionDetails.signature = await sessionOwner.signMessage({
                    message: { raw: userOpHashToSign },
                });

                userOperation.signature =
                    encodeSmartSessionSignature(sessionDetails);

                const userOpHash =
                    await smartAccountClient.sendUserOperation(userOperation);

                const receipt = await pimlicoClient.waitForUserOperationReceipt(
                    {
                        hash: userOpHash,
                    }
                ); */

                // V2
                /*   const sessionDetailsV2 = {
                    mode: SmartSessionMode.USE,
                    permissionId: getPermissionId({ session }),
                    signature: getOwnableValidatorMockSignature({
                      threshold: 1,
                    }),
                  };

                  console.log({ sessionDetailsV2 });

                  const nonce2 = await getAccountNonce(publicClient, {
                    address: safeAccount.address,
                    entryPointAddress: entryPoint07Address,
                    key: encodeValidatorNonce({
                      account,
                      validator: smartSessions,
                    }),
                  });

                  console.log({ nonce2 })
                
                  const userOperation2 = await smartAccountClient.prepareUserOperation({
                    account: safeAccount,
                    calls: [
                      {
                        to: session.actions[0].actionTarget,
                        value: BigInt(0),
                        data: session.actions[0].actionTargetSelector,
                      },
                    ],
                    nonce2,
                    signature: encodeSmartSessionSignature(sessionDetailsV2),
                  });
                

                const userOpHashToSign2 = getUserOperationHash({
                    chainId: baseSepolia.id,
                    entryPointAddress: entryPoint07Address,
                    entryPointVersion: "0.7",
                    userOperation: userOperation2,
                  });
                
                  sessionDetailsV2.signature = await sessionOwner.signMessage({
                    message: { raw: userOpHashToSign2 },
                  });
                
                  userOperation2.signature = encodeSmartSessionSignature(sessionDetailsV2);
                
                  const userOpHash2 = await smartAccountClient.sendUserOperation(userOperation2);
                
                   await pimlicoClient.waitForUserOperationReceipt({
                    hash: userOpHash2,
                  });

                
                
                  console.log(await counterContract.read.counters([safeAccount.address])); */
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
