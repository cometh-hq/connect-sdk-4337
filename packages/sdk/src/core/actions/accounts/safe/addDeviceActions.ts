import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { safeWebauthnSignerFactory } from "@/core/accounts/safe/abi/safeWebauthnSignerFactory";
import type { SafeContractConfig } from "@/core/accounts/safe/types";
import { API } from "@/core/services/API";
import type { Signer } from "@/core/types";
import type { SendTransactionsWithPaymasterParameters } from "permissionless/_types/actions/smartAccount/sendTransactions";
import type { SmartAccount } from "permissionless/accounts/types";
import { sendTransactions } from "permissionless/actions/smartAccount";

import type { EntryPoint, Prettify } from "permissionless/types";

import type { Chain, Client, Hash, Transport } from "viem";
import { encodeFunctionData, getAction } from "viem/utils";

export type ValidateAddDevice = {
    apiKey: string;
    signer: Signer;
    baseUrl?: string;
};

export async function validateAddDevice<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<ValidateAddDevice>
): Promise<Hash> {
    const { apiKey, baseUrl, signer } = args;

    const api = new API(apiKey, baseUrl);

    const { safeP256VerifierAddress, safeWebAuthnSignerFactoryAddress } =
        (await api.getContractParams()) as SafeContractConfig;

    const addOwnerCalldata = encodeFunctionData({
        abi: SafeAbi,
        functionName: "addOwnerWithThreshold",
        args: [signer.signerAddress, 1],
    });

    const smartAccountAddress = client.account?.address;

    if (!smartAccountAddress) throw new Error("No smart account address found");

    const txs = [
        {
            to: smartAccountAddress,
            value: 0,
            data: addOwnerCalldata,
        },
    ];

    if (signer.publicKeyX && signer.publicKeyY) {
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
            to: safeWebAuthnSignerFactoryAddress,
            value: 0,
            data: deployWebAuthnSignerCalldata,
        });
    }

    const hash = await getAction(
        client,
        sendTransactions<TChain, TAccount, entryPoint>,
        "sendTransactions"
    )({
        transactions: txs,
    } as unknown as SendTransactionsWithPaymasterParameters<
        entryPoint,
        TAccount
    >);

    if (signer.publicKeyX && signer.publicKeyY && signer.publicKeyId) {
        await api.createWebAuthnSigner({
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
