import { SafeAbi } from "@/accounts/abi/safe";
import { defaultClientConfig } from "@/constants";
import { APINotFoundError } from "@/errors";
import { API } from "@/services/API";
import type { DeviceData, WebAuthnSigner } from "@/types";
import { isSmartAccountDeployed } from "permissionless";
import {
    http,
    type Address,
    type Chain,
    type Client,
    type Prettify,
    type Transport,
    createPublicClient,
} from "viem";
import type { SmartAccount } from "viem/account-abstraction";

export type EnrichedOwner = {
    address: Address;
    deviceData?: DeviceData;
    creationDate?: Date;
    isSmartContract?: boolean;
};

export type GetEnrichedOwners = {
    apiKey: string;
    baseUrl?: string;
};

export async function getEnrichedOwners<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount | undefined = SmartAccount | undefined,
>(
    client: Client<TTransport, TChain, TAccount>,
    args: Prettify<GetEnrichedOwners>
): Promise<EnrichedOwner[]> {
    const rpcClient =
        // client.account?.client ??
        createPublicClient({
            chain: client.chain,
            transport: http(),
            ...defaultClientConfig,
        });

    const isDeployed = await isSmartAccountDeployed(
        rpcClient,
        client.account?.address as Address
    );

    const api = new API(args.apiKey, args.baseUrl);
    if (!api) throw new APINotFoundError();

    const webAuthnSigners =
        (await api?.getWebAuthnSignersByWalletAddressAndChain(
            client.account?.address as Address,
            rpcClient.chain?.id as number
        )) as WebAuthnSigner[];

    if (!isDeployed)
        return [
            {
                address: webAuthnSigners[0].signerAddress as Address,
                deviceData: webAuthnSigners[0].deviceData,
                creationDate: webAuthnSigners[0].creationDate,
            },
        ];

    const owners = (await rpcClient.readContract({
        address: client.account?.address as Address,
        abi: SafeAbi,
        functionName: "getOwners",
    })) as Address[];

    const enrichedOwners: EnrichedOwner[] = owners.map((owner) => {
        const webauthSigner = webAuthnSigners.find(
            (webauthnSigner) => webauthnSigner.signerAddress === owner
        );

        if (webauthSigner) {
            return {
                address: owner,
                deviceData: webauthSigner.deviceData,
                creationDate: webauthSigner.creationDate,
                isSmartContract: true,
            };
        }
        return { address: owner, isSmartContract: false };
    });

    const bytecodes = await Promise.all(
        enrichedOwners.map((owner) =>
            rpcClient.getCode({
                address: owner.address,
            })
        )
    );

    enrichedOwners.forEach((enrichedOwner, index) => {
        if (!enrichedOwner.isSmartContract && bytecodes[index] !== undefined) {
            enrichedOwner.isSmartContract = true;
        }
    });

    return enrichedOwners;
}
