import { LAUNCHPAD_ADDRESS, SAFE_7579_ADDRESS } from "@/constants";
import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import {
    APINotFoundError,
    FallbackAlreadySetError,
    SmartAccountAddressNotFoundError,
} from "@/errors";
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

    if (!api) throw new APINotFoundError();

    const smartAccountAddress = client.account?.address;

    const publicClient =
        client?.account?.publicClient ??
        createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        });

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
            // biome-ignore lint/suspicious/noExplicitAny: TODO: remove any
        } as any);

        if (!isFallbackSet) throw new FallbackAlreadySetError();
    }

    if (!smartAccountAddress) throw new SmartAccountAddressNotFoundError();

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
                    [RHINESTONE_ATTESTER_ADDRESS],
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
