import { muster, musterTestnet } from "./customChains";

const API_URL = "https://api.4337.develop.core.cometh.tech";

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

const customChains = [muster, musterTestnet];

export {
    API_URL,
    ENTRYPOINT_ADDRESS_V06,
    ENTRYPOINT_ADDRESS_V07,
    customChains,
};
