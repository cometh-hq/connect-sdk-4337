import type { Address } from "viem";
import { muster } from "./customChains";

const API_URL = "https://api.4337.cometh.io";

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

const SENTINEL_MODULES =
    "0x0000000000000000000000000000000000000001" as Address;
const SAFE_7579_ADDRESS: Address = "0x7579EE8307284F293B1927136486880611F20002";
const LAUNCHPAD_ADDRESS: Address = "0x7579011aB74c46090561ea277Ba79D510c6C00ff";

const add7579FunctionSelector = "0xd78343d9";

const customChains = [muster];

export {
    API_URL,
    ENTRYPOINT_ADDRESS_V07,
    SENTINEL_MODULES,
    SAFE_7579_ADDRESS,
    LAUNCHPAD_ADDRESS,
    customChains,
    add7579FunctionSelector,
};
