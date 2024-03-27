import {
    DefaultFactoryNotDefinedError,
    arbitrum,
    arbitrumGoerli,
    arbitrumSepolia,
    base,
    baseGoerli,
    baseSepolia,
    goerli,
    mainnet,
    optimism,
    optimismGoerli,
    optimismSepolia,
    polygon,
    polygonAmoy,
    polygonMumbai,
    sepolia,
} from "@alchemy/aa-core";
import type { Address, Chain } from "viem";

/**
 * Utility method returning the default multi owner msca factory address given a {@link Chain} object
 *
 * @param chain - a {@link Chain} object
 * @returns a {@link Address} for the given chain
 * @throws if the chain doesn't have an address currently deployed
 */
export const getDefaultMultiOwnerModularAccountFactoryAddress = (
    chain: Chain
): Address => {
    switch (chain.id) {
        case sepolia.id:
        case baseSepolia.id:
        case polygon.id:
        case mainnet.id:
        case goerli.id:
        case polygonAmoy.id:
        case polygonMumbai.id:
        case optimism.id:
        case optimismGoerli.id:
        case optimismSepolia.id:
        case arbitrum.id:
        case arbitrumGoerli.id:
        case arbitrumSepolia.id:
        case base.id:
        case baseGoerli.id:
            return "0x000000e92D78D90000007F0082006FDA09BD5f11";
    }
    throw new DefaultFactoryNotDefinedError("MultiOwnerModularAccount", chain);
};
