import axios from "axios";
import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";
import { API_URL } from "../../constants";
import type {
    DeviceData,
    WalletImplementation,
    WalletInfos,
    WebAuthnSigner,
} from "../types";

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
        return response.data.projectParams;
    }

    async getContractParams(
        walletImplementation: WalletImplementation
    ): Promise<{
        walletFactoryAddress: Address;
        P256FactoryContractAddress: Address;
    }> {
        const response = await this.api.get(
            `/wallets-4337/${walletImplementation}/contracts-params`
        );
        return response.data.contractParams;
    }

    async getWalletInfos(walletAddress: Address): Promise<WalletInfos> {
        const response = await this.api.get(
            `/wallets-4337/${walletAddress}/wallet-infos`
        );
        return response.data.walletInfos;
    }

    async initWallet({
        smartAccountAddress,
        ownerAddress,
        walletImplementation,
    }: {
        smartAccountAddress: Address;
        ownerAddress: Address;
        walletImplementation: WalletImplementation;
    }): Promise<Address> {
        const body = {
            smartAccountAddress,
            ownerAddress,
            walletImplementation,
        };

        const response = await this.api.post("/wallets-4337/init", body);

        return response.data.walletAddress;
    }

    async initWalletWithPasskey({
        walletAddress,
        publicKeyId,
        publicKeyX,
        publicKeyY,
        deviceData,
        walletImplementation,
    }: {
        walletAddress: Address;
        publicKeyId: Hex;
        publicKeyX: Hex;
        publicKeyY: Hex;
        deviceData: DeviceData;
        walletImplementation: WalletImplementation;
    }): Promise<void> {
        const body = {
            walletAddress,
            publicKeyId,
            publicKeyX,
            publicKeyY,
            deviceData,
            walletImplementation,
        };

        await this.api.post("/wallets-4337/init-with-webauthn", body);
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
        return response.data.webAuthnSigner;
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
}
