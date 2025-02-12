import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import delayModuleService from "@/core/services/delayModuleService";
import { sendTransaction } from "permissionless/actions/smartAccount";

import { defaultClientConfig } from "@/constants";
import { getProjectParamsByChain } from "@/core/services/comethService";
import { APINotFoundError, FetchingProjectParamsError, NoRecoveryRequestFoundError, RecoveryNotActiveError } from "@/errors";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Prettify,
    type PublicClient,
    type SendTransactionParameters,
    type Transport,
    createPublicClient,
    zeroHash,
} from "viem";
import { getAction } from "viem/utils";

export type CancelRecoveryRequestParams = {
    effectiveDelayAddress?: Address;
};

export async function cancelRecoveryRequest<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<CancelRecoveryRequestParams>
): Promise<Hex> {
    const { effectiveDelayAddress } = args;

    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        client.account?.publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        }) as PublicClient);

    let delayAddress: Address;

    if (effectiveDelayAddress) {
        delayAddress = effectiveDelayAddress;
    } else {
        const api = client?.account?.connectApiInstance;

        if (!api) throw new APINotFoundError();

        const projectParams = await getProjectParamsByChain({
            api,
            chain: client.chain as Chain,
        });

        if (!projectParams) throw new FetchingProjectParamsError();

        const {
            moduleFactoryAddress,
            delayModuleAddress,
            recoveryCooldown,
            recoveryExpiration,
        } = projectParams.recoveryParams;

        delayAddress = await delayModuleService.getDelayAddress(
            smartAccountAddress,
            {
                moduleFactoryAddress: moduleFactoryAddress as Address,
                delayModuleAddress: delayModuleAddress as Address,
                recoveryCooldown: recoveryCooldown as number,
                recoveryExpiration: recoveryExpiration as number,
            }
        );
    }

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: rpcClient,
    });

    if (!isDelayModuleDeployed) throw new RecoveryNotActiveError();

    const recoveryRequest = await delayModuleService.getCurrentRecoveryParams(
        delayAddress,
        rpcClient
    );

    if (!recoveryRequest) throw new NoRecoveryRequestFoundError();
    if (recoveryRequest.txHash === zeroHash)
        throw new NoRecoveryRequestFoundError();

    const updateNonceTx = await delayModuleService.createSetTxNonceFunction(
        delayAddress,
        rpcClient
    );

    const hash = await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        calls: updateNonceTx,
    } as unknown as SendTransactionParameters);

    return hash;
}
