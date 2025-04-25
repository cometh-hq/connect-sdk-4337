import type { SafeSigner } from "@/accounts/safe/safeSigner/types"
import { createPasskeySigner, getSignerAddress, isPasskeySigner } from "./createPasskeySigner"
import { safeWebAuthnSigner } from "@/accounts/safe/safeSigner/webauthn/webAuthn"
import {
    DEFAULT_WEBAUTHN_OPTIONS,
} from "@/signers/passkeys/utils";
import type { CreateSignerParams, PasskeySigner } from "./types";
import { API } from "@/services/API";
import { getViemClient } from "@/accounts/utils";
import type { Client, Chain, Transport, Address, Hex } from "viem";
import { 
    zeroHash, 
    ChainNotFoundError } from "viem";
import {
    getProjectParamsByChain,
} from "@/services/comethService";
import type { SafeContractParams } from "@/accounts/safe/types";
import { isSmartAccountDeployed } from "permissionless";
import { SAFE_7579_ADDRESS } from "@/constants";
import { SafeAbi } from "@/accounts/safe/abi/safe";
import { getAccountAddress } from "./storeWalletInComethApi";
import { getSafeSetUpData, getSetUpCallData } from "@/accounts/safe/services/safe";
import { storeWalletInComethApi } from "@/signers/storeWalletInComethApi";
import { saveSigner } from "./createPasskeySigner";

/**
 * Generates the initializer data for a Safe smart contract
 * @param accountSigner - The signer instance
 * @param threshold - The threshold for the multi-signature wallet
 * @param fallbackHandler - Address of the fallback handler
 * @param modules - Array of module addresses to enable
 * @param setUpContractAddress - Address of the setup contract
 * @param safeWebAuthnSharedSignerContractAddress - Address of the WebAuthn shared signer contract
 * @param p256Verifier - Address of the P256 verifier contract
 * @param multisendAddress - Address of the multisend contract
 * @returns Encoded initializer data as a Hex string
 */
export const getSafeInitializer = ({
    accountSigner,
    threshold,
    fallbackHandler,
    modules,
    setUpContractAddress,
    safeWebAuthnSharedSignerContractAddress,
    p256Verifier,
    multisendAddress,
}: {
    accountSigner: PasskeySigner;
    threshold: number;
    fallbackHandler: Address;
    modules: Address[];
    setUpContractAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    p256Verifier: Address;
    multisendAddress: Address;
}): Hex => {
    const signerAddress = getSignerAddress(accountSigner);

    const setUpCallData = getSetUpCallData({
        modules,
        accountSigner,
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress: safeWebAuthnSharedSignerContractAddress,
        safeP256VerifierAddress: p256Verifier,
    });

    if (isPasskeySigner(accountSigner)) {
        return getSafeSetUpData({
            owner: safeWebAuthnSharedSignerContractAddress,
            threshold,
            setUpContractAddress: multisendAddress,
            setUpData: setUpCallData,
            fallbackHandler,
        });
    }

    return getSafeSetUpData({
        owner: signerAddress,
        threshold,
        setUpContractAddress,
        setUpData: setUpCallData,
        fallbackHandler,
    });
};

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
}: CreateSignerParams): 
Promise<SafeSigner<"safeWebAuthnSigner">> {
//Promise<any> {

    const api = new API(apiKey, baseUrl);
    const [client, contractParams] = await Promise.all([
        getViemClient(chain, publicClient) as Client<
            TTransport,
            TChain,
            undefined
        >,
        getProjectParamsByChain({ api, chain }),
    ]);

    const safeProxyFactoryAddress = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67"
    const safeSingletonAddress = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762"
    const multisendAddress = "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526"
    const setUpContractAddress = "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47"
    const safe4337Module = "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226" as Address
    

    const {
        safeWebAuthnSharedSignerContractAddress,
        //setUpContractAddress,
        p256Verifier,
        //safeProxyFactoryAddress,
        //safeSingletonAddress,
        //multisendAddress,
        //safe4337ModuleAddress: safe4337Module,
        safeWebAuthnSignerFactory,
    } = 
    //safeContractConfig ??
    (contractParams.safeContractParams as SafeContractParams);

    console.log("safeWebAuthnSharedSignerContractAddress", safeWebAuthnSharedSignerContractAddress);
    console.log("safeWebAuthnSignerFactory", safeWebAuthnSignerFactory);


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
    })

    const initializer = getSafeInitializer({
        accountSigner: passkeySigner,
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
        singletonAddress: safeSingletonAddress,
        safeProxyFactoryAddress,
        saltNonce: zeroHash,
        initializer,
        signer: passkeySigner,
        api,
        publicClient,
    });

    console.log("res", res);

    if (res.isNewWallet) {
        console.log("isNewWallet", res.isNewWallet);
        await saveSigner(passkeySigner, smartAccountAddress);
    }
    console.log("smartAccountAddress", smartAccountAddress);

    let userOpVerifyingContract = safe4337Module;

    const isDeployed = await isSmartAccountDeployed(
        client,
        smartAccountAddress
    );

    if (isDeployed) {
        const is7579Enabled = await publicClient!.readContract({
            address: smartAccountAddress,
            abi: SafeAbi,
            functionName: "isModuleEnabled",
            args: [SAFE_7579_ADDRESS as Address],
        });

        if (is7579Enabled) {
            userOpVerifyingContract = SAFE_7579_ADDRESS;
        }
    }

    console.log("passkeySigner", passkeySigner);

    return safeWebAuthnSigner(client, {
        passkey: passkeySigner.passkey,
        passkeySignerAddress: passkeySigner.passkey.signerAddress,
        smartAccountAddress,
        fullDomainSelected,
        userOpVerifyingContract,
        safeWebAuthnSharedSignerContractAddress,
    })
   // return passkeySigner
}