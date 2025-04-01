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
            http: ["https://muster.alt.technology/"],
        },
        public: {
            http: ["https://muster.alt.technology/"],
        },
    },
    contracts: {
        multicall3: {
            address: "0xcA11bde05977b3631167028862bE2a173976CA11",
        },
    },
});

export const swisstronikTestnet = defineChain({
    id: 1291,
    name: "Swisstronik testnet",
    network: "swisstronik testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: ["https://json-rpc.testnet.swisstronik.com/unencrypted/"],
        },
        public: {
            http: ["https://json-rpc.testnet.swisstronik.com/unencrypted/"],
        },
    },
    contracts: {
        multicall3: {
            address: "0xcA11bde05977b3631167028862bE2a173976CA11",
        },
    },
});
