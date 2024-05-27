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
import { muster, musterTestnet, redstoneHolesky } from "./customChains";

const API_URL = "https://api.connect.cometh.io";

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

// Safe v1.4.1 contracts
const SAFE_ADDRESSES: {
    SIGNER_LAUNCHPAD_ADDRESS: string
    MODULE_4337_ADDRESS: string
    ADD_MODULES_LIB_ADDRESS: string
    MODULE_SETUP_ADDRESS: string
    WEBAUTHN_SIGNER_FACTORY_ADDRESS: string
    WEBAUTHN_VERIFIER_ADDRESS: string
    PROXY_FACTORY_ADDRESS: string
    SINGLETON_ADDRESS: string
    MULTISEND_ADDRESS: string
  } = {
    SIGNER_LAUNCHPAD_ADDRESS: '0x8a29BeF99755Cb8587189108d4D8D8f8247dB1B1',
    MODULE_4337_ADDRESS: '0xfaa6F2eC82BdA7C22220522869E854a3446053A5',
    ADD_MODULES_LIB_ADDRESS: '0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb',
    MODULE_SETUP_ADDRESS: '0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47',
    WEBAUTHN_SIGNER_FACTORY_ADDRESS: '0x05234efAd657358b56Fbe05e38800179261F429C',
    WEBAUTHN_VERIFIER_ADDRESS: '0xCAc51aDF726E4b269645a7fD6a43296A1Ff53e8d',
    PROXY_FACTORY_ADDRESS: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
    SINGLETON_ADDRESS: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
    MULTISEND_ADDRESS: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526'
  }

type RpcData = { rpcUrl: string; networkName: string; currency: string };

const networks = {
    // Default network: Polygon
    137: {
        rpcUrl: "https://polygon-rpc.com",
        networkName: "Polygon",
        currency: "MATIC",
    },
    80001: {
        rpcUrl: "https://rpc-mumbai.maticvigil.com",
        networkName: "Mumbai",
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
    2121337: {
        rpcUrl: "https://muster-anytrust.alt.technology",
        networkName: "Muster Testnet",
        currency: "ETH",
    },
    17001: {
        rpcUrl: "https://rpc.holesky.redstone.xyz",
        networkName: "Redstone Holesky",
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
    redstoneHolesky,
    optimism,
    optimismSepolia,
];

export {
    API_URL,
    SAFE_ADDRESSES,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    networks,
    supportedChains,
};
