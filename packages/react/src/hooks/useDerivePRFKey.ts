import { derivePRFKey } from "@cometh/connect-sdk-4337";
import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";

type DerivePRFKeyParameters = {
    context: string;
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
 * Same `(passkey, context)` always yields the same `prfOutput` (32 bytes
 * hex). The `context` is a domain-separation label (e.g.
 * "my-app-purpose-v1"). It must be stable across calls for the same derived
 * key — a random or per-call value will produce an unrecoverable key.
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

    const _derivePRFKey = useCallback(
        async (
            params: DerivePRFKeyParameters
        ): Promise<DerivePRFKeyResult> => {
            setIsPending(true);
            setError(null);
            try {
                return await derivePRFKey({
                    context: params.context,
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
        derivePRFKey: _derivePRFKey,
        isPending,
        error,
    };
};
