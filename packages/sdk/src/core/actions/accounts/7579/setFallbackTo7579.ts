import { LAUNCHPAD_ADDRESS, SAFE_7579_ADDRESS } from "@/constants";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    RHINESTONE_ATTESTER_ADDRESS,
    getSmartSessionsValidator,
} from "@rhinestone/module-sdk";
import { isSmartAccountDeployed } from "permissionless";

import { sendTransaction } from "permissionless/actions/smartAccount";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hash,
    type SendTransactionParameters,
    type Transport,
    createPublicClient,
} from "viem";
import { encodeFunctionData, getAction, parseAbi } from "viem/utils";

export async function setFallbackTo7579<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(client: Client<TTransport, TChain, TAccount>): Promise<Hash> {
    const api = client?.account?.connectApiInstance;

    if (!api) throw new Error("No api found");

    const smartAccountAddress = client.account?.address;

    const publicClient =
        client?.account?.publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as any);

    const isDeployed = await isSmartAccountDeployed(
        publicClient,
        smartAccountAddress as Address
    );

    if (isDeployed) {
        const isFallbackSet = await publicClient.readContract({
            address: smartAccountAddress,
            abi: SafeAbi,
            functionName: "isModuleEnabled",
            args: [SAFE_7579_ADDRESS as Address],
        });

        if (!isFallbackSet) throw new Error("Fallback already set");
    }

    if (!smartAccountAddress) throw new Error("No smart account address found");

    const smartSessions = getSmartSessionsValidator({});

    const txs = [
        {
            to: LAUNCHPAD_ADDRESS,
            data: encodeFunctionData({
                abi: parseAbi([
                    "struct ModuleInit {address module;bytes initData;}",
                    "function addSafe7579(address safe7579,ModuleInit[] calldata validators,ModuleInit[] calldata executors,ModuleInit[] calldata fallbacks, ModuleInit[] calldata hooks,address[] calldata attesters,uint8 threshold) external",
                ]),
                functionName: "addSafe7579",
                args: [
                    SAFE_7579_ADDRESS,
                    [
                        {
                            module: smartSessions.address,
                            initData: smartSessions.initData,
                        },
                    ],
                    [],
                    [],
                    [],
                    [
                        RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
                    ],
                    1,
                ],
            }),
            value: BigInt(0),
        },
    ];

    return await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        calls: txs,
    } as unknown as SendTransactionParameters);
}
