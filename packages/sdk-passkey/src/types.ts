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
