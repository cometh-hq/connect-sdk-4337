import { SafeAbi } from "@/accounts/safe/abi/safe";
import type { SafeSigner } from "@/accounts/safe/safeSigner/types";
import { safeWebAuthnSigner } from "@/accounts/safe/safeSigner/webauthn/webAuthn";
import {
    getConfigurePasskeyData,
    getSafeInitializer,
} from "@/accounts/safe/services/safe";
import type { SafeContractParams } from "@/accounts/safe/types";
import { getViemClient } from "@/accounts/utils";
import { SAFE_7579_ADDRESS } from "@/constants";
import { API } from "@/services/API";
import { getProjectParamsByChain } from "@/services/comethService";
import { DEFAULT_WEBAUTHN_OPTIONS } from "@/signers/passkeys/utils";
import { storeWalletInComethApi } from "@/signers/storeWalletInComethApi";
import { isSmartAccountDeployed } from "permissionless";
import type { Address, Chain, Client, PublicClient, Transport } from "viem";
import { http, ChainNotFoundError, createPublicClient, zeroHash } from "viem";
import { createPasskeySigner } from "./createPasskeySigner";
import { saveSigner } from "./createPasskeySigner";
import { getPasskeyInStorage } from "./passkeys/passkeyService";
import { getAccountAddress } from "./storeWalletInComethApi";
import type { CreateSignerParams, PasskeySigner } from "./types";

export async function passkeySetupTx({
    passkeySigner,
    apiKey,
    chain,
    baseUrl,
}: {
    passkeySigner: SafeSigner;
    apiKey: string;
    chain: Chain;
    baseUrl?: string;
}) {
    const api = new API(apiKey, baseUrl);
    const contractParams = await getProjectParamsByChain({ api, chain });

    const { safeWebAuthnSharedSignerContractAddress, p256Verifier } =
        //safeContractConfig ??
        contractParams.safeContractParams as SafeContractParams;

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
    } = contractParams.safeContractParams as SafeContractParams; //safeContractConfig ??

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
        safeContractParams: contractParams.safeContractParams,
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

    // TODO: passkey storage management
    // 1) Check if smart account is new
    // 2) If it is, save the signer

    const res = await storeWalletInComethApi({
        chain,
        singletonAddress: safeSingletonAddress,
        safeProxyFactoryAddress,
        saltNonce: zeroHash,
        initializer,
        signer: passkeySigner,
        api,
        publicClient,
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
        safeWebAuthnSharedSignerContractAddress,
    });
}
