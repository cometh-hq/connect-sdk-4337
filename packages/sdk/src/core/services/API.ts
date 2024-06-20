import axios from "axios";
import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";
import { API_URL } from "../../constants";
import type { DeviceData, WebAuthnSigner } from "../types";

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

    async getContractParams(): Promise<{
        safeWebAuthnSharedSignerAddress?: string;
        safe4337ModuleAddress?: string;
        safeModuleSetUpAddress?: string;
        safeP256VerifierAddress?: string;
        safeWebAuthnSignerFactoryAddress?: string;
        safeProxyFactoryAddress?: string;
        safeSingletonAddress?: string;
        multisendAddress?: string;
    }> {
        return {
            safeWebAuthnSharedSignerAddress:
                "0xfD90FAd33ee8b58f32c00aceEad1358e4AFC23f9",
            safe4337ModuleAddress: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
            safeModuleSetUpAddress:
                "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
            safeP256VerifierAddress:
                "0x445a0683e494ea0c5AF3E83c5159fBE47Cf9e765",
            safeWebAuthnSignerFactoryAddress:
                "0x05234efAd657358b56Fbe05e38800179261F429C",
            safeProxyFactoryAddress:
                "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
            safeSingletonAddress: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
            multisendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
        };
    }

    /**
     * WebAuthn Section
     */
    async createWebAuthnSigner({
        walletAddress,
        publicKeyId,
        publicKeyX,
        publicKeyY,
        deviceData,
        signerAddress,
        isSharedWebAuthnSigner,
    }: {
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

        await this.api.post("/webauthn-signer/create", body);
    }

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
        verifier,
    }: {
        publicKeyX: Hex;
        publicKeyY: Hex;
        verifier: Hex;
    }): Promise<Hex> {
        const body = {
            publicKeyX,
            publicKeyY,
            verifier,
        };

        const response = await this.api.post(
            "/webauthn-signer/predict-address",
            body
        );
        return response.data.signerAddress;
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
