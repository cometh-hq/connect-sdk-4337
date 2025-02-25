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
import { InvalidChainIdError, toFunctionSelector } from "viem";
import { type Hex, isHex, toHex } from "viem";
import type { ComethSmartAccountClient } from "./createClient";

import { smartSessionActions } from "@/core/modules/sessionKey/decorators";

import type {
    ActionPolicyInfo,
    CreateSessionDataParams,
} from "@/core/modules/sessionKey/types";

import type { GrantPermissionParameters } from "@/core/modules/sessionKey/decorators/grantPermission";

import { erc7579Actions } from "permissionless/actions/erc7579";

import type {
    GetCallsParams,
    GetCallsResult,
    PermissionRequest,
    SendCallsParams,
    SendCallsResult,
} from "./types";

import {
    CannotSignForAddressError,
    ExpiryInPastError,
    ExpiryRequiredError,
    InvalidAccountAddressError,
    InvalidParamsError,
    InvalidSignerTypeError,
    InvalidSmartAccountClientError,
    MethodNotSupportedError,
    UnsupportedPermissionTypeError,
    WalletNotConnectedError,
} from "@/errors";
import { CallStatus } from "./types/provider";
import { validatePermissions } from "./utils/permissions";

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

    private async handleWalletGrantPermissions(params: [PermissionRequest]) {
        const safe7559Account = this.comethSmartAccountClient
            .extend(smartSessionActions())
            .extend(erc7579Actions());

        const capabilities =
            this.handleWalletCapabilities()[
                toHex(this.comethSmartAccountClient.chain.id)
            ].permissions;

        if (!capabilities.signerTypes.includes(params[0].signer.type)) {
            throw new InvalidSignerTypeError();
        }

        validatePermissions(params[0], capabilities.permissionTypes);
        const permissions = params[0].permissions;

        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (!params[0].expiry) {
            throw new ExpiryRequiredError();
        }

        const sessionDuration = params[0].expiry - currentTimestamp;

        if (sessionDuration <= 0) {
            throw new ExpiryInPastError();
        }

        const sessionRequestedInfo: CreateSessionDataParams[] = permissions.map(
            (permission) => {
                const actionPoliciesInfo: ActionPolicyInfo[] = [];

                switch (permission.type) {
                    case "sudo":
                        break;

                    case "contract-call": {
                        actionPoliciesInfo.push({
                            contractAddress: permission.data
                                .contractAddress as Hex,
                            functionSelector: toFunctionSelector(
                                permission.data.functionSelector
                            ) as Hex,
                        });

                        const unsupportedFields = [
                            "validUntil",
                            "validAfter",
                            "valueLimit",
                            "tokenLimits",
                            "usageLimit",
                            "sudo",
                            "abi",
                            "rules",
                        ].filter((field) => field in permission.data);

                        if (unsupportedFields.length > 0) {
                            console.warn(
                                `Warning: The following fields are currently not supported and will be ignored: ${unsupportedFields.join(
                                    ", "
                                )}`
                            );
                        }
                        break;
                    }

                    default:
                        throw new UnsupportedPermissionTypeError(
                            permission.type
                        );
                }

                return {
                    sessionPublicKey: params[0].signer.data.address,
                    sessionValidUntil: params[0].expiry,
                    sessionValidAfter: currentTimestamp,
                    actionPoliciesInfo,
                };
            }
        );

        const grantPermissionParams: GrantPermissionParameters<ComethSafeSmartAccount> =
            {
                sessionRequestedInfo,
            };

        const createSessionsResponse = await safe7559Account.grantPermission(
            grantPermissionParams
        );

        const response = await safe7559Account.waitForUserOperationReceipt({
            hash: createSessionsResponse.userOpHash,
        });

        return {
            grantedPermissions: permissions.map((permission) => ({
                type: permission.type,
                data: permission.data,
                policies: permission.policies,
            })),
            expiry: params[0].expiry,
            permissionsContext: response.receipt.transactionHash, //renvoyer userOpHash
            createSessionsResponse,
        };
    }
}

//TODO:
//Store in localStorage?
//ShowCallsSatus method
