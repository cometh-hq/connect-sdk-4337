import type { KernelValidator } from "@zerodev/sdk/types";
import type { TypedData } from "abitype";
import { getUserOperationHash } from "permissionless";
import type { EntryPoint } from "permissionless/_types/types";
import {
    SignTransactionNotSupportedBySmartAccount,
    type SmartAccountSigner,
} from "permissionless/accounts";
import type {
    Address,
    Chain,
    Client,
    Hex,
    LocalAccount,
    Transport,
    TypedDataDefinition,
} from "viem";
import { toAccount } from "viem/accounts";
import { signMessage, signTypedData } from "viem/actions";
import { getChainId } from "viem/actions";
import {
    ENTRYPOINT_ADDRESS_V06,
    KERNEL_ADDRESSES,
} from "../../../../../config";
import type { UserOperation } from "../../../../types";


export async function signerToEcdsaValidator<
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSource extends string = "custom",
    TAddress extends Address = Address,
>(
    client: Client<TTransport, TChain, undefined>,
    {
        signer,
        entryPoint = ENTRYPOINT_ADDRESS_V06,
        validatorAddress = KERNEL_ADDRESSES.ECDSA_VALIDATOR,
    }: {
        signer: SmartAccountSigner<TSource, TAddress>;
        entryPoint?: Address;
        validatorAddress?: Address;
    }
): Promise<KernelValidator<"ECDSAValidator">> {
    // Get the private key related account
    const viemSigner: LocalAccount = {
        ...signer,
        signTransaction: (_, __) => {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
    } as LocalAccount;

    // Fetch chain id
    const chainId = await getChainId(client);

    // Build the EOA Signer
    const account = toAccount({
        address: viemSigner.address,
        async signMessage({ message }) {
            return signMessage(client, { account: viemSigner, message });
        },
        async signTransaction(_, __) {
            throw new SignTransactionNotSupportedBySmartAccount();
        },
        async signTypedData<
            const TTypedData extends TypedData | Record<string, unknown>,
            TPrimaryType extends
                | keyof TTypedData
                | "EIP712Domain" = keyof TTypedData,
        >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
            return signTypedData<TTypedData, TPrimaryType, TChain, undefined>(
                client,
                {
                    account: viemSigner,
                    ...typedData,
                }
            );
        },
    });

    return {
        ...account,
        address: validatorAddress,
        source: "ECDSAValidator",

        async getEnableData() {
            return viemSigner.address;
        },
        async getNonceKey() {
            return 0n;
        },
        // Sign a user operation
        async signUserOperation(userOperation: UserOperation) {
            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: "0x",
                },
                entryPoint: entryPoint as EntryPoint,
                chainId: chainId,
            });
            const signature = await signMessage(client, {
                account: viemSigner,
                message: { raw: hash },
            });
            return signature;
        },

        // Get simple dummy signature
        async getDummySignature() {
            return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
        },

        async isEnabled(
            _kernelAccountAddress: Address,
            _selector: Hex
        ): Promise<boolean> {
            return false;
        },
    };
}
