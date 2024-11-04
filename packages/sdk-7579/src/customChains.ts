import { defineChain } from "viem";

export const muster = defineChain({
    id: 4078,
    name: "Muster",
    network: "muster",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: [
                process.env.RPC_URL_MUSTER_TESTNET ||
                    "https://muster.alt.technology/",
            ],
        },
        public: {
            http: [
                process.env.RPC_URL_MUSTER_TESTNET ||
                    "https://muster.alt.technology/",
            ],
        },
    },
    contracts: {
        multicall3: {
            address: "0xcA11bde05977b3631167028862bE2a173976CA11",
        },
    },
});
