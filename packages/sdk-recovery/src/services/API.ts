import { API_URL } from "@/constants";
import type { ProjectParams } from "@/types";
import type { DeviceData } from "@/types";
import axios from "axios";
import type { AxiosInstance } from "axios";
import type { Address, Hex } from "viem";

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
}
