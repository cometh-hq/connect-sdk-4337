import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { safeWebauthnSignerFactory } from "@/core/accounts/safe/abi/safeWebauthnSignerFactory";
import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type { SafeContractParams } from "@/core/accounts/safe/types";
import { getProjectParamsByChain } from "@/core/services/comethService";
import type { Signer } from "@/core/types";
import { APINotFoundError, SmartAccountAddressNotFoundError } from "@/errors";

import { sendTransaction } from "permissionless/actions/smartAccount";
import type {
    Chain,
    Client,
    Hash,
    Prettify,
    SendTransactionParameters,
    Transport,
} from "viem";
import { encodeFunctionData, getAction } from "viem/utils";

export type ValidateAddDevice = {
    signer: Signer;
};

export async function validateAddDevice<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends ComethSafeSmartAccount | undefined =
        | ComethSafeSmartAccount
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<ValidateAddDevice>
): Promise<Hash> {
    const { signer } = args;

    const api = client?.account?.connectApiInstance;

    if (!api) throw new APINotFoundError();

    const addOwnerCalldata = encodeFunctionData({
        abi: SafeAbi,
        functionName: "addOwnerWithThreshold",
        args: [signer.signerAddress, 1],
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

    if (signer.publicKeyX && signer.publicKeyY) {
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
                signer.publicKeyX,
                signer.publicKeyY,
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

    if (signer.publicKeyX && signer.publicKeyY && signer.publicKeyId) {
        await api.createWebAuthnSigner({
            chainId: client.chain?.id as number,
            walletAddress: smartAccountAddress,
            publicKeyId: signer.publicKeyId,
            publicKeyX: signer.publicKeyX,
            publicKeyY: signer.publicKeyY,
            deviceData: signer.deviceData,
            signerAddress: signer.signerAddress,
            isSharedWebAuthnSigner: false,
        });
    }

    return hash;
}
