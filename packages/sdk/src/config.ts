import type { Address } from "viem";
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

// Safe v1.4.1 contracts
const SAFE_ADDRESSES: {
    SIGNER_LAUNCHPAD_ADDRESS: Address;
    MODULE_4337_ADDRESS: Address;
    ADD_MODULES_LIB_ADDRESS: Address;
    MODULE_SETUP_ADDRESS: Address;
    WEBAUTHN_SIGNER_FACTORY_ADDRESS: Address;
    WEBAUTHN_VERIFIER_ADDRESS: Address;
    PROXY_FACTORY_ADDRESS: Address;
    SINGLETON_ADDRESS: Address;
    MULTISEND_ADDRESS: Address;
} = {
    SIGNER_LAUNCHPAD_ADDRESS: "0x8a29BeF99755Cb8587189108d4D8D8f8247dB1B1",
    MODULE_4337_ADDRESS: "0xfaa6F2eC82BdA7C22220522869E854a3446053A5",
    ADD_MODULES_LIB_ADDRESS: "0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb",
    MODULE_SETUP_ADDRESS: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
    WEBAUTHN_SIGNER_FACTORY_ADDRESS:
        "0x05234efAd657358b56Fbe05e38800179261F429C",
    WEBAUTHN_VERIFIER_ADDRESS: "0xCAc51aDF726E4b269645a7fD6a43296A1Ff53e8d",
    PROXY_FACTORY_ADDRESS: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
    SINGLETON_ADDRESS: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
    MULTISEND_ADDRESS: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
};

// Kernel v2 contracts
const KERNEL_ADDRESSES: {
    WEB_AUTHN_VALIDATOR: Address;
    ECDSA_VALIDATOR: Address;
    ACCOUNT_LOGIC: Address;
    FACTORY_ADDRESS: Address;
} = {
    WEB_AUTHN_VALIDATOR: "0x07540183E6BE3b15B3bD50798385095Ff3D55cD5",
    ECDSA_VALIDATOR: "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390",
    ACCOUNT_LOGIC: "0xd3082872F8B06073A021b4602e022d5A070d7cfC",
    FACTORY_ADDRESS: "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3",
};

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

type rpcData = { rpcUrl: string; networkName: string; currency: string };

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
} as Record<number, rpcData>;

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
    KERNEL_ADDRESSES,
    SAFE_ADDRESSES,
    networks,
    supportedChains,
};
