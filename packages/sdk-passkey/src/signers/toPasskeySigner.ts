import { SafeAbi } from "@/accounts/abi/safe";
import {
    getConfigurePasskeyData,
    getSafeInitializer,
} from "@/accounts/safeService/safe";
import type { SafeSigner } from "@/accounts/safeService/types";
import type { SafeContractParams } from "@/accounts/safeService/types";
import { getViemClient } from "@/accounts/utils";
import { SAFE_7579_ADDRESS } from "@/constants";
import { API } from "@/services/API";
import { getProjectParamsByChain } from "@/services/comethService";
import { storeWalletInComethApi } from "@/signers/storeWalletInComethApi";
import { safeWebAuthnSigner } from "@/signers/webAuthn";
import { isSmartAccountDeployed } from "permissionless";
import type { Address, Chain, Client, PublicClient, Transport } from "viem";
import { http, ChainNotFoundError, createPublicClient, zeroHash } from "viem";
import { getPasskeyInStorage } from "./passkeyService/passkey";
import type { CreateSignerParams, PasskeySigner } from "./passkeyService/types";
import { getAccountAddress } from "./storeWalletInComethApi";

import {
    createPasskey,
    getPasskeySigner,
    setPasskeyInStorage,
} from "./passkeyService/passkey";

import { DeviceNotCompatibleWithPasskeysError } from "@/errors";
import type { PasskeyLocalStorageFormat } from "./passkeyService/types";
import {
    DEFAULT_WEBAUTHN_OPTIONS,
    isWebAuthnCompatible,
} from "./passkeyService/utils";

export const saveSigner = async (
    signer: PasskeySigner,
    smartAccountAddress: Address
) => {
    setPasskeyInStorage(
        smartAccountAddress,
        signer.passkey.id,
        signer.passkey.pubkeyCoordinates.x,
        signer.passkey.pubkeyCoordinates.y,
        signer.passkey.signerAddress
    );
};

/**
 * Helper to create the Passkey Signer
 * @param apiKey
 * @param smartAccountAddress
 * @param encryptionSalt
 * @param webAuthnOptions
 * @param passKeyName
 */
export async function createPasskeySigner({
    apiKey,
    chain,
    publicClient,
    smartAccountAddress,
    baseUrl,
    webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
    passKeyName,
    fullDomainSelected = false,
    safeContractParams,
}: CreateSignerParams): Promise<PasskeySigner> {
    const api = new API(apiKey, baseUrl);

    const passkeyCompatible = await await isWebAuthnCompatible(webAuthnOptions);

    if (!safeContractParams) {
        const contractParams = await api.getProjectParams(chain.id);
        safeContractParams = contractParams.safeContractParams;
    }

    if (passkeyCompatible) {
        let passkey: PasskeyLocalStorageFormat;
        if (!smartAccountAddress) {
            passkey = await createPasskey({
                api,
                webAuthnOptions,
                passKeyName,
                fullDomainSelected,
                safeWebAuthnSharedSignerAddress:
                    safeContractParams.safeWebAuthnSharedSignerContractAddress,
            });

            if (passkey.publicKeyAlgorithm !== -7) {
                throw new DeviceNotCompatibleWithPasskeysError();
            }
        } else {
            passkey = await getPasskeySigner({
                api,
                smartAccountAddress,
                chain,
                publicClient,
                safeModuleSetUpAddress: safeContractParams.setUpContractAddress,
                safeProxyFactoryAddress:
                    safeContractParams.safeProxyFactoryAddress,
                safeSingletonAddress: safeContractParams.safeSingletonAddress,
                fallbackHandler: safeContractParams.fallbackHandler as Address,
                p256Verifier: safeContractParams.p256Verifier,
                multisendAddress: safeContractParams.multisendAddress,
                safeWebAuthnSharedSignerAddress:
                    safeContractParams.safeWebAuthnSharedSignerContractAddress,
                fullDomainSelected,
            });
        }

        const passkeySigner = {
            type: "passkey",
            passkey,
        } as PasskeySigner;

        return passkeySigner;
    }
    throw new DeviceNotCompatibleWithPasskeysError();
}

export async function passkeySetupTx({
    passkeySigner,
    apiKey,
    chain,
    baseUrl,
    safeContractConfig,
}: {
    passkeySigner: SafeSigner;
    apiKey: string;
    chain: Chain;
    baseUrl?: string;
    safeContractConfig?: SafeContractParams;
}) {
    const api = new API(apiKey, baseUrl);
    const contractParams = await getProjectParamsByChain({ api, chain });

    const { safeWebAuthnSharedSignerContractAddress, p256Verifier } =
        safeContractConfig ??
        (contractParams.safeContractParams as SafeContractParams);

    const passkey = {
        type: "passkey",
        passkey: await getPasskeyInStorage(passkeySigner.smartAccountAddress),
    };

    return await getConfigurePasskeyData({
        passkeySigner: passkey as PasskeySigner,
        p256Verifier,
        safeWebAuthnSharedSignerContractAddress,
    });
}

export async function toPasskeySigner<
    TTransport extends Transport = Transport,
    TChain extends Chain = Chain,
>({
    apiKey,
    chain,
    publicClient,
    smartAccountAddress,
    baseUrl,
    webAuthnOptions = DEFAULT_WEBAUTHN_OPTIONS,
    passKeyName,
    fullDomainSelected = false,
    safeContractParams,
}: CreateSignerParams): Promise<SafeSigner<"safeWebAuthnSigner">> {
    const api = new API(apiKey, baseUrl);
    const [client, contractParams] = await Promise.all([
        getViemClient(chain, publicClient) as Client<
            TTransport,
            TChain,
            undefined
        >,
        getProjectParamsByChain({ api, chain }),
    ]);

    publicClient =
        publicClient ??
        (createPublicClient({
            chain: chain,
            transport: http(),
            cacheTime: 60_000,
            batch: {
                multicall: { wait: 50 },
            },
        }) as PublicClient);

    const {
        safeWebAuthnSharedSignerContractAddress,
        setUpContractAddress,
        p256Verifier,
        safeProxyFactoryAddress,
        safeSingletonAddress,
        multisendAddress,
        safe4337ModuleAddress: safe4337Module,
    } = safeContractParams ??
    (contractParams.safeContractParams as SafeContractParams);

    if (!safe4337Module) {
        throw new ChainNotFoundError();
    }

    const passkeySigner = await createPasskeySigner({
        apiKey,
        chain,
        publicClient,
        smartAccountAddress,
        baseUrl,
        webAuthnOptions,
        passKeyName,
        fullDomainSelected,
        safeContractParams:
            safeContractParams ?? contractParams.safeContractParams,
    });

    const initializer = getSafeInitializer({
        passkeySigner,
        threshold: 1,
        fallbackHandler: safe4337Module,
        modules: [safe4337Module],
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress,
        p256Verifier,
        multisendAddress,
    });

    if (!smartAccountAddress) {
        smartAccountAddress = await getAccountAddress({
            chain,
            singletonAddress: safeSingletonAddress,
            safeProxyFactoryAddress,
            saltNonce: zeroHash,
            initializer,
            publicClient,
        });
    }

    const res = await storeWalletInComethApi({
        chain,
        signer: passkeySigner,
        api,
        smartAccountAddress,
    });

    if (res.isNewWallet) {
        await saveSigner(passkeySigner, smartAccountAddress);
    }

    let userOpVerifyingContract = safe4337Module;

    const isDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    if (isDeployed) {
        const is7579Enabled = await publicClient.readContract({
            address: smartAccountAddress,
            abi: SafeAbi,
            functionName: "isModuleEnabled",
            args: [SAFE_7579_ADDRESS as Address],
        });

        if (is7579Enabled) {
            userOpVerifyingContract = SAFE_7579_ADDRESS;
        }
    }

    return safeWebAuthnSigner(client, {
        passkey: passkeySigner.passkey,
        passkeySignerAddress: passkeySigner.passkey.signerAddress,
        smartAccountAddress,
        fullDomainSelected,
        userOpVerifyingContract,
    });
}
