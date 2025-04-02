import type { Address } from "viem";
import { muster, swisstronikTestnet } from "./customChains";

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const SAFE_7579_ADDRESS: Address = "0x7579EE8307284F293B1927136486880611F20002";
const LAUNCHPAD_ADDRESS: Address = "0x7579011aB74c46090561ea277Ba79D510c6C00ff";

const add7579FunctionSelector = "0xd78343d9";
const hardcodeVerificationGasLimit7579 = 1000000n;

const customChains = [muster, swisstronikTestnet];

export {
    ENTRYPOINT_ADDRESS_V07,
    SAFE_7579_ADDRESS,
    LAUNCHPAD_ADDRESS,
    customChains,
    add7579FunctionSelector,
    hardcodeVerificationGasLimit7579,
};
