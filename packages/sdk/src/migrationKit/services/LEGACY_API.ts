import axios from "axios";
import type { AxiosInstance } from "axios";
import type {
    ProjectParams,
    RelayTransactionType,
    RelayedTransaction,
    RelayedTransactionDetails,
    WebAuthnSigner,
} from "../types";

export class LEGACY_API {
    private readonly api: AxiosInstance;

    constructor(apiKey: string, baseUrl?: string) {
        this.api = axios.create({
            baseURL: baseUrl || "https://api.connect.cometh.io",
        });
        this.api.defaults.headers.common.apikey = apiKey;
    }

    async getProjectParams(): Promise<ProjectParams> {
        const response = await this.api.get("/project/params");
        return response?.data?.projectParams;
    }

    async relayTransaction({
        walletAddress,
        safeTxData,
        signatures,
    }: RelayTransactionType): Promise<RelayedTransaction> {
        const body = {
            ...safeTxData,
            nonce: safeTxData?.nonce?.toString(),
            baseGas: safeTxData?.baseGas?.toString(),
            gasPrice: safeTxData?.gasPrice?.toString(),
            safeTxGas: safeTxData?.safeTxGas?.toString(),
            signatures,
        };
        const response = await this.api.post(
            `/wallets/${walletAddress}/relay`,
            body
        );
        return {
            safeTxHash: response.data.safeTxHash,
            relayId: response.data.relayId,
        };
    }

    async getWalletAddress(ownerAddress: string): Promise<string> {
        const response = await this.api.get(
            `/wallets/${ownerAddress}/wallet-address`
        );
        return response?.data?.walletAddress;
    }

    async getRelayedTransaction(
        relayId: string
    ): Promise<RelayedTransactionDetails> {
        const response = await this.api.get(`/relayed-transactions/${relayId}`);
        return response.data.relayedTransaction;
    }

    async getWebAuthnSignerByPublicKeyId(
        publicKeyId: string
    ): Promise<WebAuthnSigner> {
        const response = await this.api.get(
            `/webauthn-signer/public-key-id/${publicKeyId}`
        );
        return response?.data?.webAuthnSigner;
    }

    async getWebAuthnSignersByWalletAddress(
        walletAddress: string
    ): Promise<WebAuthnSigner[]> {
        const response = await this.api.get(
            `/webauthn-signer/${walletAddress}`
        );
        return response?.data?.webAuthnSigners;
    }
}
