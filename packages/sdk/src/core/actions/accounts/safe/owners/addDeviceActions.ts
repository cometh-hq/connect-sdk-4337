import { SafeAbi } from "@/core/accounts/safe/abi/safe";
import { safeWebauthnSignerFactory } from "@/core/accounts/safe/abi/safeWebauthnSignerFactory";
import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type { SafeContractParams } from "@/core/accounts/safe/types";
import type { Signer } from "@/core/types";
import type { SendTransactionsWithPaymasterParameters } from "permissionless/_types/actions/smartAccount/sendTransactions";
import {
    type Middleware,
    sendTransactions,
} from "permissionless/actions/smartAccount";

import type { EntryPoint, Prettify } from "permissionless/types";

import type { Chain, Client, Hash, Transport } from "viem";
import { encodeFunctionData, getAction } from "viem/utils";

export type ValidateAddDevice<entryPoint extends EntryPoint> = {
    signer: Signer;
} & Middleware<entryPoint>;

export async function validateAddDevice<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined =
        | SafeSmartAccount<entryPoint, Transport, Chain>
        | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<ValidateAddDevice<entryPoint>>
): Promise<Hash> {
    const { signer, middleware } = args;

    const api = client?.account?.getConnectApi();

    if (!api) throw new Error("No api found");

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
            value: BigInt(0),
            data: addOwnerCalldata,
        },
    ];

    if (signer.publicKeyX && signer.publicKeyY) {
        const {
            p256Verifier: safeP256VerifierAddress,
            safeWebAuthnSharedSignerContractAddress: safeWebAuthnSignerFactoryAddress,
        } = (await api.getProjectParams())
            .safeContractParams as SafeContractParams;

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
            value: BigInt(0),
            data: deployWebAuthnSignerCalldata,
        });
    }

    const hash = await getAction(
        client,
        sendTransactions<TChain, TAccount, entryPoint>,
        "sendTransactions"
    )({
        transactions: txs,
        middleware,
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
