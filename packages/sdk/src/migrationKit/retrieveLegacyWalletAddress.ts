import {
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
} from "@/errors";
import type { Address } from "viem";
import { LEGACY_API } from "./services/LEGACY_API";
import { getWebAuthnSignature } from "./signers/passkeyService";

export const retrieveLegacyWalletAddress = async (
    apiKeyLegacy: string
): Promise<string> => {
    const legacyApi = new LEGACY_API(apiKeyLegacy);
    let publicKeyId: string;

    try {
        ({ publicKeyId } = await getWebAuthnSignature("Retrieve user wallet"));
    } catch {
        throw new NoPasskeySignerFoundInDeviceError();
    }

    const signingWebAuthnSigner =
        await legacyApi.getWebAuthnSignerByPublicKeyId(publicKeyId);
    if (!signingWebAuthnSigner) throw new NoPasskeySignerFoundInDBError();

    const { walletAddress, signerAddress } = signingWebAuthnSigner;

    setLegacyPasskeyInStorage(
        walletAddress as Address,
        publicKeyId,
        signerAddress as Address
    );

    return walletAddress;
};

const setLegacyPasskeyInStorage = (
    walletAddress: string,
    publicKeyId: string,
    signerAddress: string
): void => {
    const localStorageWebauthnCredentials = JSON.stringify({
        publicKeyId,
        signerAddress,
    });
    window.localStorage.setItem(
        `cometh-connect-${walletAddress}`,
        localStorageWebauthnCredentials
    );
};
