import type { Signer } from "./types";

export const getSignerAddress = (customSigner: Signer) => {
    return customSigner.address;
};

export const getSigner = (customSigner: Signer) => {
    return customSigner;
};