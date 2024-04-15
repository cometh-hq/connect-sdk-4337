import {
    avalanche,
    avalancheFuji,
    gnosis,
    gnosisChiado,
    polygon,
    polygonMumbai,
} from "viem/chains";
import { muster, musterTestnet, redstoneHolesky } from "./customChains";

const API_URL = "https://api.connect.develop.core.cometh.tech";

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

//COMETH_CONTRACTS
const P256_SIGNER_FACTORY = "0x73dA77F0f2daaa88b908413495d3D0e37458212e";
const P256_SIGNER_SINGLETON = "0x71558e9Ac314B17Eb665441aFF60914EAE391712";

type RpcData = { rpcUrl: string; networkName: string; currency: string };

const networks = {
    // Default network: Polygon
    137: {
        rpcUrl: process.env.RPC_URL_POLYGON || "https://polygon-rpc.com",

        networkName: "Polygon",
        currency: "MATIC",
    },
    80001: {
        rpcUrl:
            process.env.RPC_URL_MUMBAI ||
            "https://polygon-mumbai-pokt.nodies.app",
        networkName: "Mumbai",
        currency: "MATIC",
    },
    43114: {
        rpcUrl:
            process.env.RPC_URL_AVALANCHE ||
            "https://avalanche-mainnet.infura.io/v3/5eba3fe58b4646c89a0e3fad285769d4",
        networkName: "Avalanche",
        currency: "AVAX",
    },
    43113: {
        rpcUrl:
            process.env.RPC_URL_FUJI ||
            "https://avalanche-fuji.infura.io/v3/5eba3fe58b4646c89a0e3fad285769d4",
        networkName: "Fuji",
        currency: "AVAX",
    },
    100: {
        rpcUrl: process.env.RPC_URL_GNOSIS || "https://rpc.gnosischain.com",
        networkName: "Gnosis Chain",
        currency: "xDai",
    },
    10200: {
        rpcUrl:
            process.env.RPC_URL_CHIADO ||
            "https://nd-244-554-535.p2pify.com/3e6f7fedad74cbc0637859cf91e7d676",
        networkName: "Chiado Chain",
        currency: "xDai",
    },
    2121337: {
        rpcUrl:
            process.env.RPC_URL_MUSTER_TESTNET ||
            "https://muster-anytrust.alt.technology",
        networkName: "Muster Testnet",
        currency: "ETH",
    },
    4078: {
        rpcUrl: process.env.RPC_URL_MUSTER || "https://muster.alt.technology/",
        networkName: "Muster",
        currency: "ETH",
    },
    17001: {
        rpcUrl:
            process.env.RPC_URL_REDSTONE_HOLESKY ||
            "https://rpc.holesky.redstone.xyz",
        networkName: "Redstone Holesky",
        currency: "ETH",
    },
} as Record<number, RpcData>;

const supportedChains = [
    polygon,
    polygonMumbai,
    avalanche,
    avalancheFuji,
    gnosis,
    gnosisChiado,
    muster,
    musterTestnet,
    redstoneHolesky,
];

export {
    API_URL,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    P256_SIGNER_FACTORY,
    P256_SIGNER_SINGLETON,
    networks,
    supportedChains,
};
