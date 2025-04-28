import { type UnionPartialBy, serializeErc6492Signature } from "viem";
import type { SmartAccount, UserOperation } from "viem/account-abstraction";
import type { SafeSigner } from "./safe/safeSigner/types";

export async function toPasskeyAccount(
    smartAccount: SmartAccount,
    passkeySigner: SafeSigner
): Promise<SmartAccount> {
    // TODO: passkey storage management
    // 1) Check if smart account is new
    // 2) If it is, save wallet in storage Connect API

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
