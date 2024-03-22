import axios from "axios";
import type { AxiosInstance } from "axios";
import { API_URL } from "../../config";

export type DeviceData = {
    browser: string;
    os: string;
    platform: string;
};

export type WebAuthnSigner = {
    projectId: string;
    userId: string;
    chainId: string;
    walletAddress: string;
    publicKeyId: string;
    publicKeyX: string;
    publicKeyY: string;
    signerAddress: string;
    deviceData: DeviceData;
};

export type WalletInfos = {
    chainId: string;
    address: string;
    creationDate: Date;
    initiatorAddress: string;
    recoveryContext?: {
        moduleFactoryAddress: string;
        delayModuleAddress: string;
        recoveryCooldown: number;
        recoveryExpiration: number;
    };
    proxyDelayAddress: string;
};

export class API {
    private readonly api: AxiosInstance;

    constructor(apiKey: string, baseUrl?: string) {
        this.api = axios.create({ baseURL: baseUrl || API_URL });
        this.api.defaults.headers.common.apiKey = apiKey;
    }

    async getProjectParams(): Promise<{
        chainId: string;
        P256FactoryContractAddress: string;
        multisendContractAddress: string;
        singletonAddress: string;
        simulateTxAcessorAddress: string;
    }> {
        const response = await this.api.get("/project/params");
        return response?.data?.projectParams;
    }

    async getWalletAddress(ownerAddress: string): Promise<string> {
        const response = await this.api.get(
            `/wallets/${ownerAddress}/wallet-address`
        );
        return response?.data?.walletAddress;
    }

    async getWalletInfos(walletAddress: string): Promise<WalletInfos> {
        const response = await this.api.get(
            `/wallets/${walletAddress}/wallet-infos`
        );
        return response?.data?.walletInfos;
    }

    async initWallet({
        ownerAddress,
    }: {
        ownerAddress: string;
    }): Promise<string> {
        const body = {
            ownerAddress,
        };

        const response = await this.api.post("/wallets/init", body);

        return response?.data.walletAddress;
    }

    async initWalletWithPasskey({
        walletAddress,
        publicKeyId,
        publicKeyX,
        publicKeyY,
        deviceData,
    }: {
        walletAddress: string;
        publicKeyId: string;
        publicKeyX: string;
        publicKeyY: string;
        deviceData: DeviceData;
    }): Promise<void> {
        const body = {
            walletAddress,
            publicKeyId,
            publicKeyX,
            publicKeyY,
            deviceData,
        };

        await this.api.post("/wallets/init-with-webauthn", body);
    }

    /**
     * WebAuthn Section
     */

    async getPasskeySignerByPublicKeyId(
        publicKeyId: string
    ): Promise<WebAuthnSigner> {
        const response = await this.api.get(
            `/webauthn-signer/public-key-id/${publicKeyId}`
        );
        return response?.data?.webAuthnSigner;
    }

    async getPasskeySignersByWalletAddress(
        walletAddress: string
    ): Promise<WebAuthnSigner[]> {
        const response = await this.api.get(
            `/webauthn-signer/${walletAddress}`
        );
        return response?.data?.webAuthnSigners;
    }
}
