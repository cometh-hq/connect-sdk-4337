import { EventEmitter } from "events";

import {
    type ComethSmartAccountClient,
    createSmartAccountClient,
} from "@/core/clients/accounts/safe/createClient";
import { createComethPaymasterClient } from "@/core/clients/paymaster/createPaymasterClient";
import {
    ENTRYPOINT_ADDRESS_V07,
    bundlerActions,
} from "permissionless";
import type { EntryPoint, ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types";
import type {
    Chain,
    EIP1193Parameters,
    EIP1193RequestFn,
    Hash,
    SendTransactionParameters,
    Transport,
} from "viem";
import { http, type Hex, isHex, toHex } from "viem";
import type {
    GetCallsParams,
    GetCallsResult,
    /*     GrantPermissionsParams, */
    SendCallsParams,
    SendCallsResult,
} from "./types";
import { ConnectLocalStorage } from "./utils/storage";
import type { SafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";

const WALLET_CAPABILITIES_STORAGE_KEY = "WALLET_CAPABILITIES";

export class ConnectEIP1193Provider<
TEntryPoint extends EntryPoint = ENTRYPOINT_ADDRESS_V07_TYPE,
TSmartAccount extends
| SafeSmartAccount<TEntryPoint, string, Transport, Chain>
| undefined =
| SafeSmartAccount<TEntryPoint, string, Transport, Chain>
| undefined,
> extends EventEmitter {
    private readonly storage = new ConnectLocalStorage("CONNECT_WALLET");
    private smartAccountClient: ComethSmartAccountClient<
        Transport,
        Chain,
        TEntryPoint,
        TSmartAccount
    >;
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    private bundlerClient: any;

    constructor(smartAccountClient: ComethSmartAccountClient<
        Transport,
        Chain,
        TEntryPoint,
        TSmartAccount
    >) {
        super();
        if (
            typeof smartAccountClient.account !== "object" ||
            typeof smartAccountClient.chain !== "object"
        ) {
            throw new Error("invalid connect client");
        }
        this.smartAccountClient =
            smartAccountClient as ComethSmartAccountClient<
            Transport,
            Chain,
            TEntryPoint,
            TSmartAccount
        >;

        const permissions = {};

        const capabilities = {
            [smartAccountClient.account.address]: {
                [toHex(smartAccountClient.chain.id)]: {
                    atomicBatch: {
                        supported: true,
                    },
                    paymasterService: {
                        supported: true,
                    },
                    permissions,
                },
            },
        };
        this.storeItemToStorage(WALLET_CAPABILITIES_STORAGE_KEY, capabilities);
        this.bundlerClient = smartAccountClient.extend(
            bundlerActions(ENTRYPOINT_ADDRESS_V07)
        );
    }

    getChainId() {
        return this.handleGetChainId();
    }

    async request({
        method,
        params = [],
    }: EIP1193Parameters): ReturnType<EIP1193RequestFn> {
        switch (method) {
            case "eth_chainId":
                return this.handleGetChainId();
            case "eth_requestAccounts":
                return this.handleEthRequestAccounts();
            case "eth_accounts":
                return this.handleEthAccounts();
            case "eth_sendTransaction":
                return this.handleEthSendTransaction(params);
            case "eth_sign":
                return this.handleEthSign(/* params as [string, string] */);
            case "personal_sign":
                return this.handlePersonalSign(
                    /* params as [string, string] */
                );
            case "eth_signTypedData":
            case "eth_signTypedData_v4":
                return this.handleEthSignTypedDataV4(
                    /*   params as [string, string] */
                );
            case "wallet_getCapabilities":
                return this.handleWalletCapabilities();
            case "wallet_sendCalls":
                return this.handleWalletSendcalls(params as [SendCallsParams]);
            case "wallet_getCallsStatus":
                return this.handleWalletGetCallStatus(
                    params as [GetCallsParams]
                );
            case "wallet_grantPermissions":
                return this.handleWalletGrantPermissions(
                    /*                     params as [GrantPermissionsParams] */
                );
            case "wallet_switchEthereumChain":
                return this.handleSwitchEthereumChain();
            default:
                return this.smartAccountClient.transport.request({
                    method,
                    params,
                });
        }
    }

    private handleGetChainId() {
        return this.smartAccountClient.chain.id;
    }

    private async handleEthRequestAccounts(): Promise<string[]> {
        if (!this.smartAccountClient.account) {
            return [];
        }
        return [this.smartAccountClient.account.address];
    }

    private async handleEthAccounts(): Promise<string[]> {
        if (!this.smartAccountClient.account) {
            return [];
        }
        return [this.smartAccountClient.account.address];
    }

    private async handleEthSendTransaction(params: unknown): Promise<Hash> {
        const [tx] = params as [SendTransactionParameters];
        return this.smartAccountClient.sendTransaction(tx);
    }

    private async handleEthSign(
        /* params: [string, string] */
    ): Promise<string> {
        throw new Error("Not implemented.");
    }

    private async handlePersonalSign(): Promise<string> {
        throw new Error("Not implemented.");
    }

    private async handleEthSignTypedDataV4(
        /*         params: [string, string] */
    ): Promise<string> {
        throw new Error("Not implemented.");
    }

    private async handleSwitchEthereumChain() {
        throw new Error("Not implemented.");
    }

    private async handleWalletSendcalls(
        params: [SendCallsParams]
    ): Promise<SendCallsResult> {
        const accountAddress = this.smartAccountClient.account.address;
        const accountChain = this.smartAccountClient.chain;

        const { calls, capabilities, from, chainId } = params[0];
        if (from !== accountAddress) {
            throw new Error("invalid account address");
        }
        if (Number(chainId) !== accountChain.id) {
            throw new Error("invalid chain id");
        }

        const paymasterClient = await createComethPaymasterClient({
            transport: http(capabilities?.paymasterService),
            chain: accountChain,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
        });

        const comethSmartAccountClient = createSmartAccountClient({
            account: this.smartAccountClient.account,
            chain: this.smartAccountClient.chain,
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            bundlerTransport: http(this.smartAccountClient.transport.url),
            middleware: {
                sponsorUserOperation: paymasterClient.sponsorUserOperation,
                gasPrice: paymasterClient.gasPrice,
            },
        });

        const encodedeCall =
                  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            await (comethSmartAccountClient.account as any).encodeCallData(
                calls.map((call) => ({
                    to: call.to ?? comethSmartAccountClient.account.address,
                    value: call.value ? BigInt(call.value) : 0n,
                    data: call.data ?? "0x",
                }))
            );

        return await comethSmartAccountClient.sendUserOperation({
            userOperation: {
                callData: encodedeCall,
            },
                      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            account: this.smartAccountClient.account as any
        });
    }

    private handleWalletCapabilities() {
        const capabilities = this.getItemFromStorage(
            WALLET_CAPABILITIES_STORAGE_KEY
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        ) as Record<string, any> | undefined;

        return capabilities
            ? capabilities[this.smartAccountClient.account.address]
            : {};
    }

    private async handleWalletGetCallStatus(
        params: [GetCallsParams]
    ): Promise<GetCallsResult> {
        const userOpHash = params[0];

        if (!isHex(userOpHash)) {
            throw new Error(
                "Invalid params for wallet_getCallStatus: not a hex string"
            );
        }
        const result = await this.bundlerClient.getUserOperationReceipt({
            hash: userOpHash as Hex,
        });
        if (!result?.success) {
            return {
                status: "PENDING",
            };
        }
        return {
            status: "CONFIRMED",
            receipts: [
                {
                              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                    logs: result.logs.map((log: any) => ({
                        address: log.address,
                        data: log.data,
                        topics: log.topics,
                    })),
                    status: result.success ? "0x1" : "0x0",
                    blockHash: result.receipt.blockHash,
                    blockNumber: toHex(result.receipt.blockNumber),
                    gasUsed: toHex(result.receipt.gasUsed),
                    transactionHash: result.receipt.transactionHash,
                },
            ],
        };
    }

    private async handleWalletGrantPermissions(
        /*      params: [GrantPermissionsParams] */
    ) {
        throw new Error("Not implemented.");
    }

    private getItemFromStorage<T>(key: string): T | undefined {
        const item = this.storage.getItem(key);
        return item ? JSON.parse(item) : undefined;
    }

    private storeItemToStorage<T>(key: string, item: T) {
        this.storage.setItem(key, JSON.stringify(item));
    }
}
