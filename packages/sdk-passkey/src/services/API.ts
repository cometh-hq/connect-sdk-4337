import type { ProjectParams, Wallet } from "@/accounts/safe/types";
import type { DeviceData, WebAuthnSigner } from "@/types";
import type { RelayedTransactionDetails } from "@/migrationKit/types";
import axios from "axios";
import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";
import { API_URL } from "@/constants";

export class API {
    private readonly api: AxiosInstance;
    private readonly _apiKey: string;

    constructor(apiKey: string, baseUrl?: string) {
        this._apiKey = apiKey;
        this.api = axios.create({ baseURL: baseUrl || API_URL });
        this.api.defaults.headers.common.apiKey = apiKey;
    }

    get apiUrl(): string {
        return this.api.defaults.baseURL || "";
    }

    get apiKey(): string {
        return this._apiKey;
    }

    async getProjectParams(chainId: number): Promise<ProjectParams> {
        const response = await this.api.get(
            `/project/params?chainId=${chainId}`
        );
        return response.data.projectParams;
    }

    async getWalletByNetworks(walletAddress: Address): Promise<Wallet[]> {
        const response = await this.api.get(`/wallet/${walletAddress}`);
        return response.data.wallets;
    }

    async createWallet({
        chainId,
        smartAccountAddress,
        initiatorAddress,
    }: {
        chainId: number;
        smartAccountAddress: Address;
        initiatorAddress: Address;
    }): Promise<void> {
        const body = {
            chainId: chainId.toString(),
            walletAddress: smartAccountAddress,
            initiatorAddress,
        };

        await this.api.post("/wallet", body);
    }

    async initWallet({
        chainId,
        smartAccountAddress,
        initiatorAddress,
        publicKeyId,
        publicKeyX,
        publicKeyY,
        deviceData,
    }: {
        chainId: number;
        smartAccountAddress: Address;
        initiatorAddress: Address;
        publicKeyId?: Hex;
        publicKeyX?: Hex;
        publicKeyY?: Hex;
        deviceData?: DeviceData;
    }): Promise<boolean> {
        const body = {
            chainId: chainId.toString(),
            walletAddress: smartAccountAddress,
            initiatorAddress,
            publicKeyId,
            publicKeyX,
            publicKeyY,
            deviceData,
        };

        const res = await this.api.post("/wallet/init", body);

        return res.data.isNewWallet;
    }

    async importExternalSafe({
        smartAccountAddress,
        publicKeyId,
        publicKeyX,
        publicKeyY,
        deviceData,
        signerAddress,
        chainId,
        transactionCalldata,
    }: {
        smartAccountAddress: Address;
        publicKeyId?: Hex;
        publicKeyX?: Hex;
        publicKeyY?: Hex;
        deviceData?: DeviceData;
        signerAddress: Address;
        chainId: string;
        transactionCalldata: Hex;
    }) {
        const body = {
            walletAddress: smartAccountAddress,
            signerAddress,
            publicKeyId,
            publicKeyX,
            publicKeyY,
            deviceData,
            chainId,
            transactionCalldata,
        };

        const res = await this.api.post("/wallet/import", body);

        return res.data.relayId;
    }

    /**
     * WebAuthn Section
     */
    async createWebAuthnSigner({
        chainId,
        walletAddress,
        publicKeyId,
        publicKeyX,
        publicKeyY,
        deviceData,
        signerAddress,
        isSharedWebAuthnSigner,
    }: {
        chainId: number;
        walletAddress: Hex;
        publicKeyId: Hex;
        publicKeyX: Hex;
        publicKeyY: Hex;
        deviceData: DeviceData;
        signerAddress: Address;
        isSharedWebAuthnSigner: boolean;
    }): Promise<void> {
        const body = {
            chainId: chainId.toString(),
            walletAddress,
            publicKeyId,
            publicKeyX,
            publicKeyY,
            deviceData,
            signerAddress,
            isSharedWebAuthnSigner,
        };

        await this.api.post("/webauthn-signer/create", body);
    }

    async getPasskeySignerByPublicKeyId(
        publicKeyId: Hex
    ): Promise<WebAuthnSigner[]> {
        const response = await this.api.get(
            `/webauthn-signer/public-key-id/${publicKeyId}`
        );
        return response.data.webAuthnSigners;
    }

    async getPasskeySignersByWalletAddress(
        walletAddress: Address
    ): Promise<WebAuthnSigner[]> {
        const response = await this.api.get(
            `/webauthn-signer/${walletAddress}`
        );
        return response.data.webAuthnSigners;
    }

    async predictWebAuthnSignerAddress({
        publicKeyX,
        publicKeyY,
    }: {
        publicKeyX: Hex;
        publicKeyY: Hex;
    }): Promise<Hex> {
        const body = {
            publicKeyX,
            publicKeyY,
        };

        const response = await this.api.post(
            "/webauthn-signer/predict-address",
            body
        );
        return response.data.signerAddress;
    }

    async getWebAuthnSignersByWalletAddressAndChain(
        walletAddress: Address,
        chainId: number
    ): Promise<WebAuthnSigner[]> {
        const response = await this.api.get(
            `/webauthn-signer/${walletAddress}/${chainId}`
        );
        return response?.data?.webAuthnSigners;
    }

    async isValidSignature(
        walletAddress: Address,
        message: string,
        signature: Hex,
        chainId: number
    ): Promise<boolean> {
        const body = {
            chainId: chainId.toString(),
            message,
            signature,
        };

        const response = await this.api.post(
            `/wallet/is-valid-signature/${walletAddress}`,
            body
        );
        return response?.data?.result;
    }

    async getRelayedTransaction(
        relayId: string,
        chainId: number
    ): Promise<RelayedTransactionDetails> {
        const body = {
            chainId: chainId.toString(),
            relayId,
        };

        const response = await this.api.post("/relayed-transactions", body);
        return response.data.relayedTransaction;
    }
}
