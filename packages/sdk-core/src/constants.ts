import type { Address } from "viem";

// 4337 Contracts
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const SAFE_7579_ADDRESS: Address = "0x7579EE8307284F293B1927136486880611F20002";
const LAUNCHPAD_ADDRESS: Address = "0x7579011aB74c46090561ea277Ba79D510c6C00ff";

const add7579FunctionSelector = "0xd78343d9";
const hardcodeVerificationGasLimit7579 = 1000000n;

const defaultSafeContractConfig = {
    safeProxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
    safeSingletonAddress: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
    multisendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
    setUpContractAddress: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
    safe4337ModuleAddress: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
};

<<<<<<< HEAD
const defaultClientConfig = {
    cacheTime: 60_000,
    batch: {
        multicall: { wait: 50 },
    },
};

=======
>>>>>>> bac4782 (feat/sdk-lite (#75))
export {
    ENTRYPOINT_ADDRESS_V07,
    SAFE_7579_ADDRESS,
    LAUNCHPAD_ADDRESS,
    add7579FunctionSelector,
    hardcodeVerificationGasLimit7579,
    defaultSafeContractConfig,
<<<<<<< HEAD
    defaultClientConfig,
=======
>>>>>>> bac4782 (feat/sdk-lite (#75))
};
