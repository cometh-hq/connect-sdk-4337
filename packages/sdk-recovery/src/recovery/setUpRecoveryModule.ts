import delayModuleService from "@/services/delayModuleService";

import { defaultClientConfig } from "@/constants";
import {
    APINotFoundError,
    FetchingProjectParamsError,
    MissingSignerAddressError,
    RecoveryAlreadySetUpError,
} from "@/errors";
import { API } from "@/services/API";
import { getProjectParamsByChain } from "@/services/comethService";
import { sendTransaction } from "permissionless/actions/smartAccount";
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
    encodeFunctionData,
    parseAbi,
} from "viem";
import type { SmartAccount } from "viem/_types/account-abstraction";
import { getAction } from "viem/utils";

export type SetUpRecoveryModuleParams = {
    signerAddress: Address;
    apiKey: string;
    baseUrl?: string;
};

export async function setUpRecoveryModule<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<SetUpRecoveryModuleParams>
): Promise<Hex> {
    const smartAccountAddress = client.account?.address as Address;

    if (!args.signerAddress) throw new MissingSignerAddressError();

    const rpcClient =
        (client.account?.client as PublicClient) ??
        createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        });

    const api = new API(args.apiKey, args.baseUrl);

    if (!api) throw new APINotFoundError();

    await api.initWallet({
        chainId: client.chain?.id as number,
        smartAccountAddress,
        initiatorAddress: args.signerAddress,
    });

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
        guardianAddress,
    } = projectParams.recoveryParams;

    const delayAddress = await delayModuleService.getDelayAddress(
        smartAccountAddress,
        {
            moduleFactoryAddress: moduleFactoryAddress as Address,
            delayModuleAddress: delayModuleAddress as Address,
            recoveryCooldown: recoveryCooldown as number,
            recoveryExpiration: recoveryExpiration as number,
        }
    );

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: rpcClient,
    });

    if (isDelayModuleDeployed) throw new RecoveryAlreadySetUpError();

    const delayModuleInitializer = await delayModuleService.setUpDelayModule({
        safe: smartAccountAddress,
        cooldown: recoveryCooldown as number,
        expiration: recoveryExpiration as number,
    });

    const setUpDelayTx = [
        {
            to: moduleFactoryAddress,
            value: BigInt(0),
            data: await delayModuleService.encodeDeployDelayModule({
                singletonDelayModule: delayModuleAddress as Address,
                initializer: delayModuleInitializer as Hex,
                safe: smartAccountAddress,
            }),
        },
        {
            to: smartAccountAddress,
            value: BigInt(0),
            data: encodeFunctionData({
                abi: parseAbi(["function enableModule(address module) public"]),
                functionName: "enableModule",
                args: [delayAddress],
            }),
        },
        {
            to: delayAddress,
            value: BigInt(0),
            data: encodeFunctionData({
                abi: parseAbi(["function enableModule(address module) public"]),
                functionName: "enableModule",
                args: [guardianAddress],
            }),
        },
    ];

    const hash = await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        calls: setUpDelayTx,
    } as unknown as SendTransactionParameters);

    return hash;
}
