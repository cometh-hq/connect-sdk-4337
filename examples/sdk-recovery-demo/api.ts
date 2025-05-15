import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_BASE_URL!;

export const api = axios.create({
    baseURL: API_URL,
});

api.defaults.headers.common["apisecret"] =
    process.env.NEXT_PUBLIC_COMETH_API_SECRET!;
