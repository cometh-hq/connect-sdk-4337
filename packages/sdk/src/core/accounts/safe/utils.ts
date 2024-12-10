import type { API } from "@/core/services/API";
import { type Abi, parseAbi } from "abitype";
import {
    type Address,
    type Prettify,
    createNonceManager,
    serializeErc6492Signature,
} from "viem";
import type {
    EntryPointVersion,
    SmartAccount,
    SmartAccountImplementation,
} from "viem/account-abstraction";
import { getCode, readContract } from "viem/actions";
import { getAction } from "viem/utils";

export type ToSmartAccountParameters<
    entryPointAbi extends Abi | readonly unknown[] = Abi,
    entryPointVersion extends EntryPointVersion = EntryPointVersion,
    extend extends object = object,
> = SmartAccountImplementation<entryPointAbi, entryPointVersion, extend>;

export type ToSmartAccountReturnType<
    implementation extends
        SmartAccountImplementation = SmartAccountImplementation,
> = Prettify<SmartAccount<implementation>>;

/**
 * @description Creates a Smart Account with a provided account implementation.
 *
 * @param parameters - {@link ToSmartAccountParameters}
 * @returns A Smart Account. {@link ToSmartAccountReturnType}
 */
export async function toSmartAccount<
    implementation extends SmartAccountImplementation & {
        connectApiInstance: API;
        signerAddress: Address;
        rpcUrl?: string;
    },
>(
    comethImplementation: implementation
): Promise<
    ToSmartAccountReturnType<implementation> & {
        connectApiInstance: API;
        signerAddress: Address;
        rpcUrl?: string;
    }
> {
    const {
        extend,
        nonceKeyManager = createNonceManager({
            source: {
                get() {
                    return Date.now();
                },
                set() {},
            },
        }),
        ...rest
    } = comethImplementation;

    let deployed = false;

    const address = await comethImplementation.getAddress();
    const signerAddress = comethImplementation.signerAddress;
    const connectApiInstance = comethImplementation.connectApiInstance;
    const rpcUrl = comethImplementation.rpcUrl;

    return {
        ...extend,
        ...rest,
        address,
        signerAddress,
        connectApiInstance,
        rpcUrl,
        async getFactoryArgs() {
            if ("isDeployed" in this && (await this.isDeployed()))
                return { factory: undefined, factoryData: undefined };
            return comethImplementation.getFactoryArgs();
        },
        async getNonce(parameters) {
            const key =
                parameters?.key ??
                BigInt(
                    await nonceKeyManager.consume({
                        address,
                        chainId: comethImplementation.client.chain
                            ?.id as number,
                        client: comethImplementation.client,
                    })
                );

            if (comethImplementation.getNonce)
                return await comethImplementation.getNonce({
                    ...parameters,
                    key,
                });

            const nonce = await readContract(comethImplementation.client, {
                abi: parseAbi([
                    "function getNonce(address, uint192) pure returns (uint256)",
                ]),
                address: comethImplementation.entryPoint.address,
                functionName: "getNonce",
                args: [address, key],
            });
            return nonce;
        },
        async isDeployed() {
            if (deployed) return true;
            const code = await getAction(
                comethImplementation.client,
                getCode,
                "getCode"
            )({
                address,
            });
            deployed = Boolean(code);
            return deployed;
        },
        ...(comethImplementation.sign
            ? {
                  async sign(parameters) {
                      const [{ factory, factoryData }, signature] =
                          await Promise.all([
                              this.getFactoryArgs(),
                              comethImplementation.sign
                                  ? comethImplementation.sign(parameters)
                                  : Promise.reject(
                                          new Error(
                                              "sign method is not defined"
                                          )
                                      ),
                          ]);
                      if (factory && factoryData)
                          return serializeErc6492Signature({
                              address: factory,
                              data: factoryData,
                              signature,
                          });
                      return signature;
                  },
              }
            : {}),
        async signMessage(parameters) {
            const [{ factory, factoryData }, signature] = await Promise.all([
                this.getFactoryArgs(),
                comethImplementation.signMessage(parameters),
            ]);
            if (factory && factoryData)
                return serializeErc6492Signature({
                    address: factory,
                    data: factoryData,
                    signature,
                });
            return signature;
        },
        async signTypedData(parameters) {
            const [{ factory, factoryData }, signature] = await Promise.all([
                this.getFactoryArgs(),
                comethImplementation.signTypedData(parameters),
            ]);
            if (factory && factoryData)
                return serializeErc6492Signature({
                    address: factory,
                    data: factoryData,
                    signature,
                });
            return signature;
        },
        type: "smart",
    } as ToSmartAccountReturnType<implementation>;
}
