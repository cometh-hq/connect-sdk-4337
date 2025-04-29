import { SafeAbi } from "@/accounts/abi/safe";
import { safeWebauthnSignerFactory } from "@/accounts/abi/safeWebauthnSignerFactory";
import type { SafeContractParams } from "@/accounts/safeService/types";
import { APINotFoundError, SmartAccountAddressNotFoundError } from "@/errors";
import { getProjectParamsByChain } from "@/services/comethService";

import { API } from "@/services/API";
import type { Signer } from "@/types";
import { sendTransaction } from "permissionless/actions/smartAccount";
import type {
    Chain,
    Client,
    Hash,
    Prettify,
    SendTransactionParameters,
    Transport,
} from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { encodeFunctionData, getAction } from "viem/utils";

export type AddPasskeyOwner = {
    passkeySigner: Signer;
    apiKey: string;
    baseUrl?: string;
};

export async function addPasskeyOwner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<AddPasskeyOwner>
): Promise<Hash> {
    const { passkeySigner } = args;

    const api = new API(args.apiKey, args.baseUrl);

    if (!api) throw new APINotFoundError();

    const addOwnerCalldata = encodeFunctionData({
        abi: SafeAbi,
        functionName: "addOwnerWithThreshold",
        args: [passkeySigner.signerAddress, 1],
    });

    const smartAccountAddress = client.account?.address;

    if (!smartAccountAddress) throw new SmartAccountAddressNotFoundError();

    const txs = [
        {
            to: smartAccountAddress,
            value: BigInt(0),
            data: addOwnerCalldata,
        },
    ];

    if (passkeySigner.publicKeyX && passkeySigner.publicKeyY) {
        const {
            p256Verifier: safeP256VerifierAddress,
            safeWebAuthnSignerFactory,
        } = (
            await getProjectParamsByChain({ api, chain: client.chain as Chain })
        ).safeContractParams as SafeContractParams;

        const deployWebAuthnSignerCalldata = encodeFunctionData({
            abi: safeWebauthnSignerFactory,
            functionName: "createSigner",
            args: [
                passkeySigner.publicKeyX,
                passkeySigner.publicKeyY,
                safeP256VerifierAddress,
            ],
        });

        txs.unshift({
            to: safeWebAuthnSignerFactory,
            value: BigInt(0),
            data: deployWebAuthnSignerCalldata,
        });
    }

    const hash = await getAction(
        client,
        sendTransaction,
        "sendTransaction"
    )({
        calls: txs,
    } as unknown as SendTransactionParameters);

    if (
        passkeySigner.publicKeyX &&
        passkeySigner.publicKeyY &&
        passkeySigner.publicKeyId
    ) {
        await api.createWebAuthnSigner({
            chainId: client.chain?.id as number,
            walletAddress: smartAccountAddress,
            publicKeyId: passkeySigner.publicKeyId,
            publicKeyX: passkeySigner.publicKeyX,
            publicKeyY: passkeySigner.publicKeyY,
            deviceData: passkeySigner.deviceData,
            signerAddress: passkeySigner.signerAddress,
            isSharedWebAuthnSigner: false,
        });
    }

    return hash;
}
