import type { SmartAccount, UserOperation } from "viem/account-abstraction";
import type { SafeSigner } from "./safe/safeSigner/types";
import { zeroHash, type Hex, type Address, type Chain, encodeFunctionData, hexToBigInt, type UnionPartialBy, serializeErc6492Signature } from "viem";
import { SafeProxyContractFactoryABI } from "./safe/abi/safeProxyFactory";
import { getSafeInitializer } from "./safe/services/safe";
import type { SafeContractParams } from "./safe/types";
import { API } from "@/services/API";
import { getProjectParamsByChain } from "@/services/comethService";
import { getPasskeyInStorage } from "@/signers/passkeys/passkeyService";
import type { PasskeySigner } from "@/signers/types";

/**
 * Get the account initialization code for a Safe smart account
 */
const getAccountInitCode = async ({
    initializer,
    singletonAddress,
    saltNonce = zeroHash,
}: {
    initializer: Hex;
    singletonAddress: Address;
    saltNonce?: Hex;
}): Promise<Hex> => {
    return encodeFunctionData({
        abi: SafeProxyContractFactoryABI,
        functionName: "createProxyWithNonce",
        args: [singletonAddress, initializer, hexToBigInt(saltNonce)],
    });
};

export async function toPasskeyAccount(
    smartAccount: SmartAccount,
    passkeySigner: SafeSigner,
    apiKey: string,
    chain: Chain,
    baseUrl?: string,
): Promise<SmartAccount> {


    //TODO

    const api = new API(apiKey, baseUrl);
    const contractParams = await getProjectParamsByChain({ api, chain })
    
    //const safeProxyFactoryAddress = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67"
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

    const passkey = {
        type: "passkey",
        passkey: await getPasskeyInStorage(passkeySigner.address),
    } as PasskeySigner

    const initializer = getSafeInitializer({
        accountSigner: passkey,
        threshold: 1,
        fallbackHandler: safe4337Module,
        modules: [safe4337Module],
        setUpContractAddress,
        safeWebAuthnSharedSignerContractAddress,
        p256Verifier,
        multisendAddress,
    });

    console.log(await getAccountInitCode({
                     initializer,
                     singletonAddress: safeSingletonAddress,
                 }))

    const passkeyAccount = {
        ...smartAccount,
        async signMessage({ message }: { message: string }) {
            const [{ factory, factoryData }, signature] = await Promise.all([
                this.getFactoryArgs(),
                passkeySigner.signMessage({ message }),
            ]);
            if (factory && factoryData)
                return serializeErc6492Signature({
                    address: factory,
                    data: factoryData,
                    signature,
                });
            return signature;
        },
        async signUserOperation(
            parameters: UnionPartialBy<UserOperation, "sender"> & {
                chainId?: number | undefined;
            }
        ) {
            return passkeySigner.signUserOperation(parameters);
        },
        async getStubSignature() {
            return passkeySigner.getStubSignature();
        },
        // async getFactoryArgs() {
        //     return {
        //         factory: safeProxyFactoryAddress as Address,
        //         factoryData: await getAccountInitCode({
        //             initializer,
        //             singletonAddress: safeSingletonAddress,
        //         })
        //     };
        // },
    };

    return passkeyAccount as SmartAccount;
}