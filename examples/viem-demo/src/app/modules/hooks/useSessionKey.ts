"use client";

import {
    type ComethSmartAccountClient,
    type SafeSigner,
    erc7579Actions,
    smartSessionActions,
    toSmartSessionsSigner,
} from "@cometh/connect-sdk-4337";
import { SmartSessionMode } from "@rhinestone/module-sdk";
import { useState } from "react";
import { type Address, type Hex, stringify, toFunctionSelector } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export function parse(data: string): Record<string, any> {
    return JSON.parse(data, (_, value) => {
        if (value && typeof value === "object" && value.__type === "bigint") {
            return BigInt(value.value);
        }
        return value;
    });
}

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export function useSessionKey() {
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [newSigner, setNewSigner] = useState<any | null>(null);

    const getSessionKeySigner = async ({
        smartAccountClient,
    }: {
        smartAccountClient: ComethSmartAccountClient;
    }): Promise<SafeSigner> => {
        const stringifiedSessionData = localStorage.getItem(
            `session-key-${smartAccountClient?.account?.address}`
        );

        const safe7559Account = smartAccountClient
            .extend(smartSessionActions())
            .extend(erc7579Actions());

        const privateKey = generatePrivateKey();
        const sessionOwner = privateKeyToAccount(privateKey);

        if (!stringifiedSessionData) {
            const createSessionsResponse =
                await safe7559Account.grantPermission({
                    sessionRequestedInfo: [
                        {
                            sessionPublicKey: sessionOwner.address,
                            /*     actionPoliciesInfo: [
                                    {
                                        contractAddress: COUNTER_CONTRACT_ADDRESS,
                                        functionSelector: toFunctionSelector(
                                            "function count()"
                                        ) as Hex,
                                    },
                                ], */
                        },
                    ],
                });

            await safe7559Account.waitForUserOperationReceipt({
                hash: createSessionsResponse.userOpHash,
            });

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

            const sessionParams = stringify(sessionData);

            localStorage.setItem(
                `session-key-${smartAccountClient?.account?.address}`,
                sessionParams
            );

            return await toSmartSessionsSigner(safe7559Account, {
                moduleData: sessionData.moduleData,
                signer: privateKeyToAccount(sessionData.privateKey),
            });
        } else {
            const usersSessionData = parse(stringifiedSessionData);

            return await toSmartSessionsSigner(safe7559Account, {
                moduleData: usersSessionData.moduleData,
                signer: privateKeyToAccount(usersSessionData.privateKey),
            });
        }
    };

    return {
        getSessionKeySigner,
        connectionError,
        newSigner,
        setNewSigner,
        setConnectionError,
    };
}
