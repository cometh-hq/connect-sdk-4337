import type { Address } from "viem";

const SENTINEL_MODULES =
    "0x0000000000000000000000000000000000000001" as Address;
const API_URL = "https://api.4337.cometh.io";

const defaultClientConfig = {
    cacheTime: 60_000,
    batch: {
        multicall: { wait: 50 },
    },
};

export { SENTINEL_MODULES, API_URL, defaultClientConfig };
