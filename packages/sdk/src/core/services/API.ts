import type { ProjectParams, Wallet } from "@/core/accounts/safe/types";
import type { DeviceData, WebAuthnSigner } from "@/core/types";
import axios from "axios";
import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";
import { API_URL } from "../../constants";

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
        const response = await this.api.get(`/project/params/${chainId}`);
        return response.data.projectParams;
    }

    async getWallet(walletAddress: Address, chainId: number): Promise<Wallet> {
        const response = await this.api.get(
            `/wallet/${walletAddress}/${chainId}`
        );
        return response.data.wallet;
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
            walletAddress: smartAccountAddress,
            initiatorAddress,
        };

        await this.api.post(`/wallet/${chainId}`, body);
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
            walletAddress,
            publicKeyId,
            publicKeyX,
            publicKeyY,
            deviceData,
            signerAddress,
            isSharedWebAuthnSigner,
        };

        await this.api.post(`/webauthn-signer/create/${chainId}`, body);
    }

    async getPasskeySignerByPublicKeyIdByChain(
        publicKeyId: Hex,
        chainId: number
    ): Promise<WebAuthnSigner> {
        const response = await this.api.get(
            `/webauthn-signer/public-key-id/${publicKeyId}/${chainId}`
        );
        return response.data.webAuthnSigner;
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

    async getWebAuthnSignersByWalletAddress(
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
        signature: Hex
    ): Promise<boolean> {
        const body = {
            message,
            signature,
        };

        const response = await this.api.post(
            `/wallet/is-valid-signature/${walletAddress}`,
            body
        );
        return response?.data?.result;
    }
}
