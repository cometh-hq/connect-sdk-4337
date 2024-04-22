import axios from "axios";
import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";
import { API_URL } from "../../constants";
import type { DeviceData, WalletInfos, WebAuthnSigner } from "../types";

export class API {
    private readonly api: AxiosInstance;

    constructor(apiKey: string, baseUrl?: string) {
        this.api = axios.create({ baseURL: baseUrl || API_URL });
        this.api.defaults.headers.common.apiKey = apiKey;
    }

    async getProjectParams(): Promise<{
        chainId: string;
        P256FactoryContractAddress: Address;
        multisendContractAddress: Address;
        singletonAddress: Address;
        simulateTxAcessorAddress: Address;
    }> {
        const response = await this.api.get("/project/params");
        return response?.data?.projectParams;
    }

    async getWalletAddress(ownerAddress: Address): Promise<Address> {
        const response = await this.api.get(
            `/wallets/${ownerAddress}/wallet-address`
        );
        return response?.data?.walletAddress;
    }

    async getWalletInfos(walletAddress: Address): Promise<WalletInfos> {
        const response = await this.api.get(
            `/wallets/${walletAddress}/wallet-infos`
        );
        return response?.data?.walletInfos;
    }

    async initWallet({
        ownerAddress,
    }: {
        ownerAddress: Address;
    }): Promise<Address> {
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
        walletAddress: Address;
        publicKeyId: Hex;
        publicKeyX: Hex;
        publicKeyY: Hex;
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
        publicKeyId: Hex
    ): Promise<WebAuthnSigner> {
        const response = await this.api.get(
            `/webauthn-signer/public-key-id/${publicKeyId}`
        );
        return response?.data?.webAuthnSigner;
    }

    async getPasskeySignersByWalletAddress(
        walletAddress: Address
    ): Promise<WebAuthnSigner[]> {
        const response = await this.api.get(
            `/webauthn-signer/${walletAddress}`
        );
        return response?.data?.webAuthnSigners;
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
        return response.data?.signerAddress;
    }
}
