import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type { SafeSigner } from "@/core/accounts/safe/safeSigner/types";
import type { ComethSmartAccountClient } from "@/core/clients/accounts/safe/createClient";
import type { UsePermissionModuleData } from "@biconomy/sdk";
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

export const isPermissionEnabledAbi = [
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
] as const;

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
    parameters: UsePermissionModuleData & { signer: PrivateKeyAccount }
): Promise<SafeSigner<"safeSmartSessionsSigner">> {
    const {
        signer,
        permissionId = "0x",
        mode = SmartSessionMode.USE,
    } = parameters;

    const publicClient = createPublicClient({
        transport: http(),
        chain: smartAccountClient?.chain,
    });

    const isPermissionInstalled = await publicClient.readContract({
        address: SMART_SESSIONS_ADDRESS,
        abi: isPermissionEnabledAbi,
        functionName: "isPermissionEnabled",
        args: [permissionId, smartAccountClient?.account?.address as Address],
    });

    if (!isPermissionInstalled)
        throw new Error("Permission not installed for this wallet");

    const account = toAccount({
        address: signer.address,
        async signMessage() {
            throw new Error("not supported");
        },
        async signTransaction(_, __) {
            throw new Error("not supported");
        },
        async signTypedData() {
            throw new Error("not supported");
        },
    });

    return {
        ...account,
        address: SMART_SESSIONS_ADDRESS,
        source: "safeSmartSessionsSigner",
        getStubSignature: async () =>
            encodeSmartSessionSignature({
                mode,
                permissionId,
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
                permissionId,
                signature: await signer.signMessage({
                    message: { raw: userOpHash as Hex },
                }),
            });
        },
    };
}
