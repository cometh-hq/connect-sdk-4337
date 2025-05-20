import type { Address, Hex } from "viem";

export type MultiSendTransaction = {
    to: string;
    value?: Hex;
    data: Hex;
    operation: number;
};

export type SafeContractParams = {
    safeProxyFactoryAddress: Address;
    safeSingletonAddress: Address;
    multisendAddress: Address;
    fallbackHandler: Address;
    setUpContractAddress: Address;
    safeWebAuthnSharedSignerContractAddress: Address;
    p256Verifier: Address;
    safeWebAuthnSignerFactory: Address;
    safe4337ModuleAddress?: Address;
    safe4337SessionKeysModule?: Address;
    migrationContractAddress?: Address;
};

export type RecoveryParams = {
    socialRecoveryModuleAddress: Address;
    moduleFactoryAddress: Address;
    delayModuleAddress: Address;
    recoveryCooldown: number;
    recoveryExpiration: number;
    guardianAddress: Address;
};

export type ProjectParams = {
    chainId: string;
    safeContractParams: SafeContractParams;
    recoveryParams: RecoveryParams;
};

export type DeviceData = {
    browser: string;
    os: string;
    platform: string;
};
