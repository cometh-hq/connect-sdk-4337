import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { getPermissionId } from "@biconomy/sdk";
import { SMART_SESSIONS_ADDRESS, type Session } from "@rhinestone/module-sdk";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    createPublicClient,
} from "viem";

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

export type IsPermissionInstalledParameters = {
    session: Session;
};

export async function isPermissionInstalled<
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<Transport, Chain | undefined, TAccount>,
    parameters: IsPermissionInstalledParameters
): Promise<boolean> {
    const { session } = parameters;

    const publicClient =
        client.account?.publicClient ??
        createPublicClient({
            transport: http(),
            chain: client.chain,
        });

    const chainId = publicClient?.chain?.id;

    if (!chainId) {
        throw new Error("chainId not found");
    }

    const permissionId = (await getPermissionId({
        client: publicClient,
        session: session,
    })) as Hex;

    return await publicClient.readContract({
        address: SMART_SESSIONS_ADDRESS,
        abi: isPermissionEnabledAbi,
        functionName: "isPermissionEnabled",
        args: [permissionId, client?.account?.address as Address],
    });
}
