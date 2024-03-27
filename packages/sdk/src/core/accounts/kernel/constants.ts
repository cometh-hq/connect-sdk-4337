import type { Address } from "viem";

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

export { KERNEL_ADDRESSES };