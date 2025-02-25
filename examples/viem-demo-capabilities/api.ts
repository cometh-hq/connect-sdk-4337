import axios from "axios";

// biome-ignore lint/style/noNonNullAssertion: TODO
export const API_URL = process.env.NEXT_PUBLIC_BASE_URL!;

export const api = axios.create({
    baseURL: API_URL,
});

api.defaults.headers.common.apisecret =
    // biome-ignore lint/style/noNonNullAssertion: TODO
    process.env.NEXT_PUBLIC_COMETH_API_SECRET!;
