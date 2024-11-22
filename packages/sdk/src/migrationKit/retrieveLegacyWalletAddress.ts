import {
    NoPasskeySignerFoundInDBError,
    NoPasskeySignerFoundInDeviceError,
} from "@/errors";
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

    const { walletAddress } = signingWebAuthnSigner;

    return walletAddress;
};
