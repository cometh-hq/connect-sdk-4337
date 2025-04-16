import { type UnionPartialBy, serializeErc6492Signature } from "viem";
import type { SmartAccount, UserOperation } from "viem/account-abstraction";
import type { SafeSigner } from "./types";

export async function toSmartSessionsAccount(
    smartAccount: SmartAccount,
    sessionKeySigner: SafeSigner
): Promise<SmartAccount> {
    const smartSessionsAccount = {
        ...smartAccount,
        async signMessage({ message }: { message: string }) {
            const [{ factory, factoryData }, signature] = await Promise.all([
                this.getFactoryArgs(),
                sessionKeySigner.signMessage({ message }),
            ]);
            if (factory && factoryData)
                return serializeErc6492Signature({
                    address: factory,
                    data: factoryData,
                    signature,
                });
            return signature;
        },
        async signUserOperation(
            parameters: UnionPartialBy<UserOperation, "sender"> & {
                chainId?: number | undefined;
            }
        ) {
            return sessionKeySigner.signUserOperation(parameters);
        },
        async getStubSignature() {
            return sessionKeySigner.getStubSignature();
        },
    };

    return smartSessionsAccount as SmartAccount;
}
