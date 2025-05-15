import { type UnionPartialBy, serializeErc6492Signature } from "viem";
import type { SmartAccount, UserOperation } from "viem/account-abstraction";
import type { SafeSigner } from "./safeService/types";

export async function toPasskeyAccount(
    smartAccount: SmartAccount,
    passkeySigner: SafeSigner
): Promise<SmartAccount> {
    const passkeyAccount = {
        ...smartAccount,
        async signMessage({ message }: { message: string }) {
            const [{ factory, factoryData }, signature] = await Promise.all([
                this.getFactoryArgs(),
                passkeySigner.signMessage({ message }),
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
            return passkeySigner.signUserOperation(parameters);
        },
        async getStubSignature() {
            return passkeySigner.getStubSignature();
        },
    };

    return passkeyAccount as SmartAccount;
}
