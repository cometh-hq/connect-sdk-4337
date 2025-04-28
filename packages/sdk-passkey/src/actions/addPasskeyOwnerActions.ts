import { SafeAbi } from "@/accounts/abi/safe";
import { safeWebauthnSignerFactory } from "@/accounts/abi/safeWebauthnSignerFactory";
import type { SafeContractParams } from "@/accounts/safeService/types";
import { APINotFoundError, SmartAccountAddressNotFoundError } from "@/errors";
import { getProjectParamsByChain } from "@/services/comethService";

import { API } from "@/services/API";
import { getDeviceData } from "@/services/deviceService";
import type { PasskeySigner } from "@/signers/passkeyService/types";
import { saveSigner } from "@/signers/toPasskeySigner";
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

export type AddNewPasskeyOwner = {
    passkeySigner: PasskeySigner;
    apiKey: string;
    baseUrl?: string;
};

export async function addPasskeyOwner<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<AddNewPasskeyOwner>
): Promise<Hash> {
    const { passkeySigner } = args;

    const api = new API(args.apiKey, args.baseUrl);

    if (!api) throw new APINotFoundError();

    const addOwnerCalldata = encodeFunctionData({
        abi: SafeAbi,
        functionName: "addOwnerWithThreshold",
        args: [passkeySigner.passkey.signerAddress, 1],
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

    if (
        passkeySigner.passkey.pubkeyCoordinates.x &&
        passkeySigner.passkey.pubkeyCoordinates.y
    ) {
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
                passkeySigner.passkey.pubkeyCoordinates.x,
                passkeySigner.passkey.pubkeyCoordinates.y,
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
        passkeySigner.passkey.pubkeyCoordinates.x &&
        passkeySigner.passkey.pubkeyCoordinates.y &&
        passkeySigner.passkey.id
    ) {
        await api.createWebAuthnSigner({
            chainId: client.chain?.id as number,
            walletAddress: smartAccountAddress,
            publicKeyId: passkeySigner.passkey.id,
            publicKeyX: passkeySigner.passkey.pubkeyCoordinates.x,
            publicKeyY: passkeySigner.passkey.pubkeyCoordinates.y,
            deviceData: getDeviceData(),
            signerAddress: passkeySigner.passkey.signerAddress,
            isSharedWebAuthnSigner: false,
        });

        await saveSigner(passkeySigner, smartAccountAddress);
    }

    return hash;
}
