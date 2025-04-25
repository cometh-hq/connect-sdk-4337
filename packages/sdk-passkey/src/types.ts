import type { Address, Hex } from 'viem';

export type DeviceData = {
    browser: string;
    os: string;
    platform: string;
};

export type WebAuthnSigner = {
    projectId: string;
    userId: string;
    chainId: string;
    smartAccountAddress: string;
    publicKeyId: string;
    publicKeyX: string;
    publicKeyY: string;
    signerAddress: string;
    deviceData: DeviceData;
    creationDate?: Date;
};

export type Signer = {
    signerAddress: Address;
    deviceData: DeviceData;
    publicKeyId?: Hex;
    publicKeyX?: Hex;
    publicKeyY?: Hex;
};