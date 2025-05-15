import { API_URL } from "@/constants";
import type { ProjectParams } from "@/types";
import axios from "axios";
import type { AxiosInstance } from "axios";

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
}
