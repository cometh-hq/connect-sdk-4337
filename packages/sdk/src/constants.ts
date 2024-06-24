import {
    arbitrum,
    arbitrumSepolia,
    avalanche,
    avalancheFuji,
    base,
    baseSepolia,
    gnosis,
    gnosisChiado,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
    polygonMumbai,
} from "viem/chains";
import { muster, musterTestnet } from "./customChains";

const API_URL = "https://api.4337.develop.core.cometh.tech";

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

type RpcData = { rpcUrl: string; networkName: string; currency: string };

const networks = {
    // Default network: Polygon
    137: {
        rpcUrl: "https://polygon-rpc.com",
        networkName: "Polygon",
        currency: "MATIC",
    },
    80002: {
        rpcUrl: "https://rpc-amoy.polygon.technology",
        networkName: "Amoy",
        currency: "MATIC",
    },
    43114: {
        rpcUrl: "https://avalanche.drpc.org",
        networkName: "Avalanche",
        currency: "AVAX",
    },
    43113: {
        rpcUrl: "https://avalanche-fuji-c-chain-rpc.publicnode.com",
        networkName: "Fuji",
        currency: "AVAX",
    },
    3084: {
        rpcUrl: "",
        networkName: "XL network",
        currency: "XL",
    },
    100: {
        rpcUrl: "https://rpc.gnosischain.com",
        networkName: "Gnosis Chain",
        currency: "xDai",
    },
    10200: {
        rpcUrl: "https://nd-244-554-535.p2pify.com/3e6f7fedad74cbc0637859cf91e7d676",
        networkName: "Chiado Chain",
        currency: "xDai",
    },
    4078: {
        rpcUrl: "https://muster.alt.technology/",
        networkName: "Muster",
        currency: "ETH",
    },
    10: {
        rpcUrl: "https://mainnet.optimism.io",
        networkName: "Optimism",
        currency: "ETH",
    },
    11155420: {
        rpcUrl: "https://sepolia.optimism.io/",
        networkName: "Optimism sepolia",
        currency: "ETH",
    },
    42161: {
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        networkName: "Arbitrum One",
        currency: "ETH",
    },
    421614: {
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        networkName: "Arbitrum sepolia",
        currency: "ETH",
    },
    8453: {
        rpcUrl: "https://mainnet.base.org",
        networkName: "Base",
        currency: "ETH",
    },
    84532: {
        rpcUrl: "https://sepolia.base.org",
        networkName: "Base sepolia",
        currency: "ETH",
    },
} as Record<number, RpcData>;

const supportedChains = [
    arbitrum,
    arbitrumSepolia,
    polygon,
    polygonMumbai,
    polygonAmoy,
    avalanche,
    avalancheFuji,
    gnosis,
    gnosisChiado,
    base,
    baseSepolia,
    muster,
    musterTestnet,
    optimism,
    optimismSepolia,
];

export {
    API_URL,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    networks,
    supportedChains,
};
