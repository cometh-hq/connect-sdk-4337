import { EventEmitter } from "events";

import type { ComethSafeSmartAccount } from "@/core/accounts/safe/createSafeSmartAccount";
import type {
    Chain,
    EIP1193Parameters,
    EIP1193RequestFn,
    Hash,
    SendTransactionParameters,
    Transport,
} from "viem";
import { InvalidChainIdError } from "viem";
import { type Hex, isHex, toHex } from "viem";
import type { ComethSmartAccountClient } from "./createClient";

import type {
    GetCallsParams,
    GetCallsResult,
    PermissionRequest,
    SendCallsParams,
    SendCallsResult,
} from "./types";

import { CallStatus } from "./types";

import {
    CannotSignForAddressError,
    InvalidAccountAddressError,
    InvalidParamsError,
    InvalidSmartAccountClientError,
    MethodNotSupportedError,
    WalletNotConnectedError,
} from "@/errors";

export class EIP1193Provider extends EventEmitter {
    private comethSmartAccountClient: ComethSmartAccountClient<
        Transport,
        Chain,
        ComethSafeSmartAccount
    >;

    private permissions;
    private capabilities;

    constructor(
        comethSmartAccountClient: ComethSmartAccountClient<
            Transport,
            Chain,
            ComethSafeSmartAccount
        >
    ) {
        super();
        if (
            typeof comethSmartAccountClient.account !== "object" ||
            typeof comethSmartAccountClient.chain !== "object"
        ) {
            throw new InvalidSmartAccountClientError();
        }
        this.comethSmartAccountClient =
            comethSmartAccountClient as ComethSmartAccountClient<
                Transport,
                Chain,
                ComethSafeSmartAccount
            >;

        this.permissions = {
            supported: true,
            signerTypes: ["account"],
            permissionTypes: ["sudo", "contract-call"],
        };

        this.capabilities = {
            [comethSmartAccountClient.account.address]: {
                [toHex(comethSmartAccountClient.chain.id)]: {
                    atomicBatch: {
                        supported: true,
                    },
                    paymasterService: {
                        supported: true,
                    },
                    permissions: this.permissions,
                },
            },
        };
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
                return this.handleEthSign(params as [string, string]);
            case "personal_sign":
                return this.handlePersonalSign(params as [string, string]);
            case "eth_signTypedData":
            case "eth_signTypedData_v4":
                return this.handleEthSignTypedDataV4(
                    params as [string, string]
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
                    params as [PermissionRequest]
                );
            case "wallet_switchEthereumChain":
                return this.handleSwitchEthereumChain();
            default:
                return this.comethSmartAccountClient.transport.request({
                    method,
                    params,
                });
        }
    }

    private handleGetChainId() {
        return this.comethSmartAccountClient.chain.id;
    }

    private async handleEthRequestAccounts(): Promise<string[]> {
        if (!this.comethSmartAccountClient.account) {
            return [];
        }
        return [this.comethSmartAccountClient.account.address];
    }

    private async handleEthAccounts(): Promise<string[]> {
        if (!this.comethSmartAccountClient.account) {
            return [];
        }
        return [this.comethSmartAccountClient.account.address];
    }

    private async handleEthSendTransaction(params: unknown): Promise<Hash> {
        const [tx] = params as [SendTransactionParameters];
        return this.comethSmartAccountClient.sendTransaction(tx);
    }

    private async handleEthSign(params: [string, string]): Promise<string> {
        if (!this.comethSmartAccountClient?.account) {
            throw new WalletNotConnectedError();
        }
        const [address, message] = params;
        if (
            address.toLowerCase() !==
            this.comethSmartAccountClient.account.address.toLowerCase()
        ) {
            throw new CannotSignForAddressError();
        }

        return this.comethSmartAccountClient.signMessage({
            message,
            account: this.comethSmartAccountClient.account,
        });
    }

    private async handlePersonalSign(
        params: [string, string]
    ): Promise<string> {
        if (!this.comethSmartAccountClient?.account) {
            throw new WalletNotConnectedError();
        }
        const [message, address] = params;
        if (
            address.toLowerCase() !==
            this.comethSmartAccountClient.account.address.toLowerCase()
        ) {
            throw new CannotSignForAddressError();
        }

        return this.comethSmartAccountClient.signMessage({
            message,
            account: this.comethSmartAccountClient.account,
        });
    }

    private async handleEthSignTypedDataV4(
        params: [string, string]
    ): Promise<string> {
        if (!this.comethSmartAccountClient?.account) {
            throw new WalletNotConnectedError();
        }
        const [address, typedDataJSON] = params;
        const typedData = JSON.parse(typedDataJSON);
        if (
            address.toLowerCase() !==
            this.comethSmartAccountClient.account.address.toLowerCase()
        ) {
            throw new CannotSignForAddressError();
        }

        return this.comethSmartAccountClient.signTypedData({
            account: this.comethSmartAccountClient.account,
            domain: typedData.domain,
            types: typedData.types,
            message: typedData.message,
            primaryType: typedData.primaryType,
        });
    }

    private async handleWalletGrantPermissions(_params: [PermissionRequest]) {
        throw new MethodNotSupportedError();
    }

    private async handleSwitchEthereumChain() {
        throw new MethodNotSupportedError();
    }

    private async handleWalletSendcalls(
        params: [SendCallsParams]
    ): Promise<SendCallsResult> {
        const accountAddress = this.comethSmartAccountClient.account.address;
        const accountChainId = this.comethSmartAccountClient.chain.id;

        const { calls, from, chainId } = params[0];
        if (from !== accountAddress) {
            throw new InvalidAccountAddressError();
        }
        if (Number(chainId) !== accountChainId) {
            throw new InvalidChainIdError({ chainId: Number(chainId) });
        }

        return await this.comethSmartAccountClient.sendUserOperation({
            calls: calls.map((call) => ({
                to: call.to ?? this.comethSmartAccountClient.account.address,
                value: call.value ? BigInt(call.value) : 0n,
                data: call.data ?? "0x",
            })),
        });
    }

    private handleWalletCapabilities() {
        const capabilities = this.capabilities as
            // biome-ignore lint/suspicious/noExplicitAny: TODO
            Record<string, any> | undefined;

        return capabilities
            ? capabilities[this.comethSmartAccountClient.account.address]
            : {};
    }

    private async handleWalletGetCallStatus(
        params: [GetCallsParams]
    ): Promise<GetCallsResult> {
        const userOpHash = params[0];

        if (!isHex(userOpHash)) {
            throw new InvalidParamsError(
                "Invalid params for wallet_getCallStatus: not a hex string"
            );
        }
        const result =
            await this.comethSmartAccountClient.waitForUserOperationReceipt({
                hash: userOpHash as Hex,
            });
        if (!result?.success) {
            return {
                status: CallStatus.PENDING,
            };
        }
        return {
            status: CallStatus.CONFIRMED,
            receipts: [
                {
                    logs: result.logs.map((log) => ({
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
}
