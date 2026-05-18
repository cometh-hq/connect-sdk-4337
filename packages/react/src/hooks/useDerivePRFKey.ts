import { derivePRFKeyForSmartAccount } from "@cometh/connect-sdk-4337";
import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";

type DerivePRFKeyParameters = {
    salt: Hex;
    smartAccountAddress: Address;
    fullDomainSelected?: boolean;
    rpId?: string;
};

type DerivePRFKeyResult = {
    prfOutput: Hex;
    publicKeyId: Hex;
};

/**
 * Hook for deriving a deterministic symmetric key from a passkey via the
 * WebAuthn PRF extension.
 *
 * Same `(passkey, salt)` always yields the same `prfOutput` (32 bytes hex).
 * Suitable as a seed for downstream cryptographic use (e.g. seeding a
 * Bermuda account, deriving an AES key via HKDF, etc.).
 *
 * Triggers a biometric prompt on each call. Cache the result in memory for
 * the session to avoid prompting the user repeatedly.
 *
 * Constraints:
 * - The credential must support PRF. Synced passkeys (Apple Passwords, Google
 *   Password Manager) support PRF on assertion even when the credential was
 *   created without it. Hardware keys (YubiKey, etc.) require PRF to have
 *   been requested at credential creation.
 * - Throws `PRFNotSupportedError` if the authenticator or credential does
 *   not provide a PRF output.
 */
export const useDerivePRFKey = () => {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const derivePRFKey = useCallback(
        async (
            params: DerivePRFKeyParameters
        ): Promise<DerivePRFKeyResult> => {
            setIsPending(true);
            setError(null);
            try {
                return await derivePRFKeyForSmartAccount({
                    salt: params.salt,
                    smartAccountAddress: params.smartAccountAddress,
                    fullDomainSelected: params.fullDomainSelected ?? false,
                    rpId: params.rpId,
                });
            } catch (e) {
                const err =
                    e instanceof Error ? e : new Error("An error occurred");
                setError(err);
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        []
    );

    return {
        derivePRFKey,
        isPending,
        error,
    };
};
