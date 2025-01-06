import { delayModuleABI } from "@/core/accounts/safe/abi/delayModule";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import { isModuleEnabled } from "@/core/accounts/safe/services/safe";
import { getProjectParamsByChain } from "@/core/services/comethService";
import delayModuleService from "@/core/services/delayModuleService";
import { sendTransaction } from "permissionless/actions/smartAccount";

import {
    http,
    type Address,
    type Chain,
    type Client,
    type Hex,
    type Prettify,
    type SendTransactionParameters,
    type Transport,
    createPublicClient,
    encodeFunctionData,
    parseAbi,
    type PublicClient,
} from "viem";
import { getAction } from "viem/utils";

export type GetDelayModuleAddressParams = {
    expiration: number;
    cooldown: number;
};

export async function getDelayModuleAddress<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<GetDelayModuleAddressParams>
): Promise<Address> {
    const { expiration, cooldown } = args;
    const smartAccountAddress = client.account?.address as Address;

    const api = client?.account?.connectApiInstance;
    if (!api) throw new Error("No API found");

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
    publicClient?: PublicClient;
};

export async function getGuardianAddress<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<GetGuardianAddressParams>
): Promise<Address> {
    const { delayModuleAddress, publicClient } = args;
    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as PublicClient);

    const isEnabled = await isModuleEnabled({
        safeAddress: smartAccountAddress,
        client: rpcClient,
        moduleAddress: delayModuleAddress,
    });

    if (!isEnabled) {
        throw new Error("Delay module not enabled");
    }

    return await delayModuleService.getGuardianAddress({
        delayAddress: delayModuleAddress,
        client: rpcClient,
    });
}

export type AddGuardianParams = {
    delayModuleAddress: Address;
    guardianAddress: Address;
    publicClient?: PublicClient;
};

export async function addGuardian<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<AddGuardianParams>
): Promise<Hex> {
    const { delayModuleAddress, guardianAddress, publicClient } = args;
    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as PublicClient);

    const isEnabled = await isModuleEnabled({
        safeAddress: smartAccountAddress,
        client: rpcClient,
        moduleAddress: delayModuleAddress,
    });

    if (!isEnabled) {
        throw new Error("Delay module not enabled");
    }

    const existingGuardian = await delayModuleService.getGuardianAddress({
        delayAddress: delayModuleAddress,
        client: rpcClient,
    });

    if (existingGuardian) {
        throw new Error("Guardian already enabled");
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
    expiration?: number;
    cooldown?: number;
    publicClient?: PublicClient;
};

export async function disableGuardian<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<DisableGuardianParams>
): Promise<Hex> {
    const { guardianAddress, expiration, cooldown, publicClient } = args;
    const smartAccountAddress = client.account?.address as Address;

    const rpcClient =
        publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as PublicClient);

    const api = client?.account?.connectApiInstance;
    if (!api) throw new Error("No API found");

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
        throw new Error("Delay module not enabled");
    }

    const prevModuleAddress = await delayModuleService.findPrevModule({
        delayAddress,
        targetModule: guardianAddress,
        client: rpcClient,
    });

    if (!prevModuleAddress) {
        throw new Error("Previous module not found");
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
        transactions: [disableGuardianTx],
    } as unknown as SendTransactionParameters);
}

export type SetupCustomDelayModuleParams = {
    guardianAddress: Address;
    expiration?: number;
    cooldown?: number;
    publicClient?: PublicClient;
};

export async function setupCustomDelayModule<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
    | ComethSafeSmartAccount
    | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<SetupCustomDelayModuleParams>
): Promise<Hex> {
    const { guardianAddress, expiration, cooldown, publicClient } = args;
    const smartAccountAddress = client.account?.address as Address;


    const rpcClient =
        publicClient ??
        (createPublicClient({
            chain: client.chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as PublicClient);

    const api = client?.account?.connectApiInstance;
    if (!api) throw new Error("No API found");

    const projectParams = await getProjectParamsByChain({
        api,
        chain: client.chain as Chain,
    });
    if (!projectParams) throw new Error("Error fetching project params");

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
        throw new Error("Delay module already set up");
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
        transactions: setUpDelayTx,
    } as unknown as SendTransactionParameters);

    return hash;
}