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
export const getDefaultMultiP256OwnerModularAccountFactoryAddress = (
    chain: Chain
): Address => {
  
    return "0xe26D33084dac4F03482e59Fc01C9Fe03dc8603B0"
};
