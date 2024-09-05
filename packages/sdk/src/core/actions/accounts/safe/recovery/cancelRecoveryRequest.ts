import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import delayModuleService from "@/core/services/delayModuleService";
import type { SendTransactionsWithPaymasterParameters } from "permissionless/_types/actions/smartAccount/sendTransactions";
import {
    type Middleware,
    sendTransactions,
} from "permissionless/actions/smartAccount";

import type { EntryPoint, Prettify } from "permissionless/types";

import { NoRecoveryRequestFoundError } from "@/errors";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Transport,
    createPublicClient,
    zeroHash,
} from "viem";
import { getAction } from "viem/utils";

export type CancelRecoveryRequestParams<entryPoint extends EntryPoint> = {
    rpcUrl?: string;
} & Middleware<entryPoint>;

export async function cancelRecoveryRequest<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined =
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<CancelRecoveryRequestParams<entryPoint>>
): Promise<Hex> {
    const { rpcUrl, middleware } = args;

    const smartAccounAddress = client.account?.address as Address;

    const publicClient = createPublicClient({
        chain: client.chain,
        transport: http(rpcUrl),
        cacheTime: 60_000,
        batch: {
            multicall: { wait: 50 },
        },
    });

    const api = client?.account?.getConnectApi();

    if (!api) throw new Error("No api found");

    const projectParams = await api.getProjectParams();

    if (!projectParams) throw Error("Error fetching project params");

    const {
        moduleFactoryAddress,
        delayModuleAddress,
        recoveryCooldown,
        recoveryExpiration,
    } = projectParams.recoveryParams;

    const delayAddress = await delayModuleService.getDelayAddress(
        smartAccounAddress,
        {
            moduleFactoryAddress: moduleFactoryAddress as Address,
            delayModuleAddress: delayModuleAddress as Address,
            recoveryCooldown: recoveryCooldown as number,
            recoveryExpiration: recoveryExpiration as number,
        }
    );

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: publicClient,
    });

    if (!isDelayModuleDeployed) throw Error("Recovery not active");

    const recoveryRequest = await delayModuleService.getCurrentRecoveryParams(
        delayAddress,
        client.chain as Chain,
        rpcUrl
    );

    if (!recoveryRequest) throw new NoRecoveryRequestFoundError();
    if (recoveryRequest.txHash === zeroHash)
        throw new NoRecoveryRequestFoundError();

    const updateNonceTx = await delayModuleService.createSetTxNonceFunction(
        delayAddress,
        publicClient
    );

    const hash = await getAction(
        client,
        sendTransactions<TChain, TAccount, entryPoint>,
        "sendTransactions"
    )({
        transactions: updateNonceTx,
        middleware,
    } as unknown as SendTransactionsWithPaymasterParameters<
        entryPoint,
        TAccount
    >);

    return hash;
}
