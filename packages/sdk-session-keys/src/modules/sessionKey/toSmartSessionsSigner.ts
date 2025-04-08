import { MethodNotSupportedError, PermissionNotInstalledError } from "@/errors";
import type {
    ComethSafeSmartAccount,
    ComethSmartAccountClient,
    SafeSigner,
} from "@cometh/connect-sdk-4337";
import {
    SMART_SESSIONS_ADDRESS,
    SmartSessionMode,
    encodeSmartSessionSignature,
    encodeValidatorNonce,
    getAccount,
    getOwnableValidatorMockSignature,
    getSmartSessionsValidator,
} from "@rhinestone/module-sdk";
import { getAccountNonce } from "permissionless/actions";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type PrivateKeyAccount,
    type Transport,
    createPublicClient,
} from "viem";
import {
    type UserOperation,
    entryPoint07Address,
    getUserOperationHash,
} from "viem/account-abstraction";
import { toAccount } from "viem/accounts";
import { isPermissionEnabledAbi } from "./decorators/isPermissionInstalled";
import type { UsePermissionModuleData } from "./types";

export type UsePermissionModuleParameters = {
    moduleData?: UsePermissionModuleData;
    signer: PrivateKeyAccount;
};

export async function toSmartSessionsSigner<
    transport extends Transport,
    chain extends Chain | undefined = undefined,
    account extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
    client extends Client | undefined = undefined,
>(
    smartAccountClient: ComethSmartAccountClient<
        transport,
        chain,
        account,
        client
    >,
    parameters: UsePermissionModuleParameters
): Promise<SafeSigner<"safeSmartSessionsSigner">> {
    const {
        signer,
        moduleData: {
            permissionIdIndex = 0,
            permissionIds = [],
            mode = SmartSessionMode.USE,
            enableSessionData,
        } = {},
    } = parameters;

    const publicClient =
        smartAccountClient.account?.publicClient ??
        createPublicClient({
            chain: smartAccountClient?.chain,
            transport: http(),
        });

    const isPermissionInstalled = await publicClient.readContract({
        address: SMART_SESSIONS_ADDRESS,
        abi: isPermissionEnabledAbi,
        functionName: "isPermissionEnabled",
        args: [
            permissionIds[permissionIdIndex],
            smartAccountClient?.account?.address as Address,
        ],
    });

    if (!isPermissionInstalled) throw new PermissionNotInstalledError();

    const account = toAccount({
        address: signer.address,
        async signMessage() {
            throw new MethodNotSupportedError();
        },
        async signTransaction(_, __) {
            throw new MethodNotSupportedError();
        },
        async signTypedData() {
            throw new MethodNotSupportedError();
        },
    });

    return {
        ...account,
        address: SMART_SESSIONS_ADDRESS,
        source: "safeSmartSessionsSigner",
        getStubSignature: async () =>
            encodeSmartSessionSignature({
                mode,
                permissionId: permissionIds[permissionIdIndex],
                enableSessionData,
                signature: getOwnableValidatorMockSignature({
                    threshold: 1,
                }),
            }),
        signUserOperation: async (parameters) => {
            const { ...userOperation } = parameters;

            const smartSessions = getSmartSessionsValidator({});

            userOperation.nonce = await getAccountNonce(publicClient, {
                address: smartAccountClient?.account?.address as Address,
                entryPointAddress: entryPoint07Address,
                key: encodeValidatorNonce({
                    account: getAccount({
                        address: smartAccountClient?.account
                            ?.address as Address,
                        type: "safe",
                    }),
                    validator: smartSessions,
                }),
            });

            const userOpHash = getUserOperationHash({
                chainId: smartAccountClient?.chain?.id as number,
                entryPointAddress: entryPoint07Address,
                entryPointVersion: "0.7",
                userOperation: userOperation as UserOperation,
            });

            return encodeSmartSessionSignature({
                mode,
                permissionId: permissionIds[permissionIdIndex],
                enableSessionData,
                signature: await signer.signMessage({
                    message: { raw: userOpHash as Hex },
                }),
            });
        },
    };
}
