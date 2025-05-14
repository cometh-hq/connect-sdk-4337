import { delayModuleABI } from "@/abi/delayModule";
import { defaultClientConfig } from "@/constants";
import {
    APINotFoundError,
    DelayModuleAlreadySetUpError,
    DelayModuleNotEnabledError,
    FetchingProjectParamsError,
    GuardianAlreadyEnabledError,
    PreviousModuleNotFoundError,
} from "@/errors";
import { getProjectParamsByChain } from "@/services/comethService";
import delayModuleService from "@/services/delayModuleService";
import { isModuleEnabled } from "@/services/safe";
import { sendTransaction } from "permissionless/actions/smartAccount";

import { API } from "@/services/API";
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
import type { SmartAccount } from "viem/account-abstraction";
import { getAction } from "viem/utils";

export type GetDelayModuleAddressParams = {
    expiration: number;
    cooldown: number;
    apiKey: string;
    baseUrl?: string;
};

export async function getDelayModuleAddress<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<GetDelayModuleAddressParams>
): Promise<Address> {
    const { expiration, cooldown } = args;
    const smartAccountAddress = client.account?.address as Address;

    const api = new API(args.apiKey, args.baseUrl);
    if (!api) throw new APINotFoundError();

    const projectParams = await getProjectParamsByChain({
        api,
        chain: client.chain as Chain,
    });

    const { delayModuleAddress, moduleFactoryAddress } =
        projectParams.recoveryParams;

    return await delayModuleService.getDelayAddress(smartAccountAddress, {
        moduleFactoryAddress: moduleFactoryAddress as Address,
        delayModuleAddress: delayModuleAddress as Address,
        recoveryCooldown: cooldown,
        recoveryExpiration: expiration,
    });
}

export type GetGuardianAddressParams = {
    delayModuleAddress: Address;
};

export async function getGuardianAddress<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<GetGuardianAddressParams>
): Promise<Address> {
    const { delayModuleAddress } = args;
    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        (client.account?.client as PublicClient) ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        }) as PublicClient);

    const isEnabled = await isModuleEnabled({
        safeAddress: smartAccountAddress,
        client: rpcClient,
        moduleAddress: delayModuleAddress,
    });

    if (!isEnabled) {
        throw new DelayModuleNotEnabledError();
    }

    return await delayModuleService.getGuardianAddress({
        delayAddress: delayModuleAddress,
        client: rpcClient,
    });
}

export type AddGuardianParams = {
    delayModuleAddress: Address;
    guardianAddress: Address;
};

export async function addGuardian<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<AddGuardianParams>
): Promise<Hex> {
    const { delayModuleAddress, guardianAddress } = args;
    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        (client.account?.client as PublicClient) ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        }) as PublicClient);

    const isEnabled = await isModuleEnabled({
        safeAddress: smartAccountAddress,
        client: rpcClient,
        moduleAddress: delayModuleAddress,
    });

    if (!isEnabled) {
        throw new DelayModuleNotEnabledError();
    }

    const existingGuardian = await delayModuleService.getGuardianAddress({
        delayAddress: delayModuleAddress,
        client: rpcClient,
    });

    if (existingGuardian) {
        throw new GuardianAlreadyEnabledError();
    }

    const addGuardianTx = {
        to: delayModuleAddress,
        value: BigInt(0),
        data: encodeFunctionData({
            abi: delayModuleABI,
            functionName: "enableModule",
            args: [guardianAddress],
        }),
    };

    const hash = await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        calls: [addGuardianTx],
    } as unknown as SendTransactionParameters);

    return hash;
}

export type DisableGuardianParams = {
    guardianAddress: Address;
    apiKey: string;
    baseUrl?: string;
    expiration?: number;
    cooldown?: number;
};

export async function disableGuardian<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<DisableGuardianParams>
): Promise<Hex> {
    const { guardianAddress, expiration, cooldown } = args;
    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        (client.account?.client as PublicClient) ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        }) as PublicClient);

    const api = new API(args.apiKey, args.baseUrl);
    if (!api) throw new APINotFoundError();

    const projectParams = await getProjectParamsByChain({
        api,
        chain: client.chain as Chain,
    });

    const { delayModuleAddress, moduleFactoryAddress } =
        projectParams.recoveryParams;

    const finalCooldown =
        cooldown ?? projectParams.recoveryParams.recoveryCooldown;
    const finalExpiration =
        expiration ?? projectParams.recoveryParams.recoveryExpiration;

    const delayAddress = await delayModuleService.getDelayAddress(
        smartAccountAddress,
        {
            moduleFactoryAddress: moduleFactoryAddress,
            delayModuleAddress: delayModuleAddress,
            recoveryCooldown: finalCooldown,
            recoveryExpiration: finalExpiration,
        }
    );

    const isEnabled = await isModuleEnabled({
        safeAddress: smartAccountAddress,
        client: rpcClient,
        moduleAddress: delayAddress,
    });

    if (!isEnabled) {
        throw new DelayModuleNotEnabledError();
    }

    const prevModuleAddress = await delayModuleService.findPrevModule({
        delayAddress,
        targetModule: guardianAddress,
        client: rpcClient,
    });

    if (!prevModuleAddress) {
        throw new PreviousModuleNotFoundError();
    }

    const disableGuardianTx = {
        to: delayAddress,
        value: BigInt(0),
        data: encodeFunctionData({
            abi: delayModuleABI,
            functionName: "disableModule",
            args: [prevModuleAddress, guardianAddress],
        }),
    };

    return await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        calls: [disableGuardianTx],
    } as unknown as SendTransactionParameters);
}

export type SetupCustomDelayModuleParams = {
    guardianAddress: Address;
    apiKey: string;
    baseUrl?: string;
    expiration?: number;
    cooldown?: number;
};

export async function setupCustomDelayModule<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<SetupCustomDelayModuleParams>
): Promise<Hex> {
    const { guardianAddress, expiration, cooldown } = args;
    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        (client.account?.client as PublicClient) ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        }) as PublicClient);

    const api = new API(args.apiKey, args.baseUrl);
    if (!api) throw new APINotFoundError();

    const projectParams = await getProjectParamsByChain({
        api,
        chain: client.chain as Chain,
    });
    if (!projectParams) throw new FetchingProjectParamsError();

    const {
        delayModuleAddress,
        moduleFactoryAddress,
        recoveryCooldown,
        recoveryExpiration,
    } = projectParams.recoveryParams;

    const finalCooldown = cooldown ?? recoveryCooldown;
    const finalExpiration = expiration ?? recoveryExpiration;

    const delayAddress = await delayModuleService.getDelayAddress(
        smartAccountAddress,
        {
            moduleFactoryAddress: moduleFactoryAddress as Address,
            delayModuleAddress: delayModuleAddress as Address,
            recoveryCooldown: finalCooldown,
            recoveryExpiration: finalExpiration,
        }
    );

    const isDelayModuleDeployed = await delayModuleService.isDeployed({
        delayAddress,
        client: rpcClient,
    });

    if (isDelayModuleDeployed) {
        throw new DelayModuleAlreadySetUpError();
    }

    const delayModuleInitializer = await delayModuleService.setUpDelayModule({
        safe: smartAccountAddress,
        cooldown: finalCooldown,
        expiration: finalExpiration,
    });

    const setUpDelayTx = [
        {
            to: moduleFactoryAddress as Address,
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
        calls: [setUpDelayTx],
    } as unknown as SendTransactionParameters);

    return hash;
}
