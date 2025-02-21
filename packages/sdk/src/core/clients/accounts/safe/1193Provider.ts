import { EventEmitter } from "events"

import { ENTRYPOINT_ADDRESS_V07 } from "@/constants"

import type {
    Chain,
    EIP1193Parameters,
    EIP1193RequestFn,
    Transport,
    SendTransactionParameters,
    Hash,
} from "viem"
import { toFunctionSelector } from "viem"
import { type Hex, isHex, toHex } from "viem"
import type { ComethSmartAccountClient } from "./createClient"
import type {
    ComethSafeSmartAccount,
} from "@/core/accounts/safe/createSafeSmartAccount"

import {
    smartSessionActions,
} from "@/core/modules/sessionKey/decorators"

import type {
    ActionPolicyInfo,
    CreateSessionDataParams,
} from "@/core/modules/sessionKey/types";

import type { GrantPermissionParameters } from "@/core/modules/sessionKey/decorators/grantPermission";

import { erc7579Actions } from "permissionless/actions/erc7579";

import type {
    GetCallsParams,
    GetCallsResult,
    SendCallsParams,
    SendCallsResult,
    PermissionRequest,
} from "./types"

import { validatePermissions } from "./utils/permissions"


export class EIP1193Provider extends EventEmitter {
    private comethSmartAccountClient: ComethSmartAccountClient<
        Transport,
        Chain,
        ComethSafeSmartAccount
    >

    private permissions
    private capabilities

    constructor(
        comethSmartAccountClient: ComethSmartAccountClient<
            Transport,
            Chain,
            ComethSafeSmartAccount
        >
    ) {
        super()
        if (
            typeof comethSmartAccountClient.account !== "object" ||
            typeof comethSmartAccountClient.chain !== "object"
        ) {
            throw new Error("invalid Smart Account Client")
        }
        this.comethSmartAccountClient = comethSmartAccountClient as ComethSmartAccountClient<
            Transport,
            Chain,
            ComethSafeSmartAccount
        >

        this.permissions =
            comethSmartAccountClient.account.entryPoint.address === ENTRYPOINT_ADDRESS_V07
                ? {
                    supported: true,
                    signerTypes: ["account"],
                    permissionTypes: [
                        "sudo",
                        "contract-call",
                    ]
                }
                : {
                    supported: false
                }

        this.capabilities = {
            [comethSmartAccountClient.account.address]: {
                [toHex(comethSmartAccountClient.chain.id)]: {
                    atomicBatch: {
                        supported: true
                    },
                    paymasterService: {
                        supported: true
                    },
                    permissions: this.permissions
                }
            }
        }

    }

    getChainId() {
        return this.handleGetChainId()
    }

    async request({
        method,
        params = []
    }: EIP1193Parameters): ReturnType<EIP1193RequestFn> {
        switch (method) {
            case "eth_chainId":    //OK
                return this.handleGetChainId()
            case "eth_requestAccounts":   //OK
                return this.handleEthRequestAccounts()
            case "eth_accounts":  //OK
                return this.handleEthAccounts()
            case "eth_sendTransaction":  //OK
                return this.handleEthSendTransaction(params)
            case "eth_sign":  //OK
                return this.handleEthSign(params as [string, string])
            case "personal_sign":  //OK
                return this.handlePersonalSign(params as [string, string])
            case "eth_signTypedData":  //Error Method not supported
            case "eth_signTypedData_v4":  //Error Method not supported
                return this.handleEthSignTypedDataV4(params as [string, string])
            case "wallet_getCapabilities":  //OK
                return this.handleWalletCapabilities()
            case "wallet_sendCalls":   //OK
                return this.handleWalletSendcalls(params as [SendCallsParams])
            case "wallet_getCallsStatus":  //OK
                return this.handleWalletGetCallStatus(
                    params as [GetCallsParams]
                )
            case "wallet_grantPermissions":  //OK
                return this.handleWalletGrantPermissions(
                    params as [PermissionRequest]
                )
            case "wallet_switchEthereumChain": //OK
                return this.handleSwitchEthereumChain()
            default:
                return this.comethSmartAccountClient.transport.request({ method, params })
        }
    }

    private handleGetChainId() {
        return this.comethSmartAccountClient.chain.id
    }

    private async handleEthRequestAccounts(): Promise<string[]> {
        if (!this.comethSmartAccountClient.account) {
            return []
        }
        return [this.comethSmartAccountClient.account.address]
    }

    private async handleEthAccounts(): Promise<string[]> {
        if (!this.comethSmartAccountClient.account) {
            return []
        }
        return [this.comethSmartAccountClient.account.address]
    }

    private async handleEthSendTransaction(params: unknown): Promise<Hash> {
        const [tx] = params as [SendTransactionParameters]
        return this.comethSmartAccountClient.sendTransaction(tx)
    }

    private async handleEthSign(params: [string, string]): Promise<string> {
        if (!this.comethSmartAccountClient?.account) {
            throw new Error("account not connected!")
        }
        const [address, message] = params
        console.log("address", address.toLowerCase())
        console.log("this.address", this.comethSmartAccountClient.account.address.toLowerCase())
        if (
            address.toLowerCase() !==
            this.comethSmartAccountClient.account.address.toLowerCase()
        ) {
            throw new Error(
                "cannot sign for address that is not the current account"
            )
        }

        return this.comethSmartAccountClient.signMessage({
            message,
            account: this.comethSmartAccountClient.account
        })
    }


    private async handlePersonalSign(
        params: [string, string]
    ): Promise<string> {
        if (!this.comethSmartAccountClient?.account) {
            throw new Error("account not connected!")
        }
        const [message, address] = params
        if (
            address.toLowerCase() !==
            this.comethSmartAccountClient.account.address.toLowerCase()
        ) {
            throw new Error(
                "cannot sign for address that is not the current account"
            )
        }

        return this.comethSmartAccountClient.signMessage({
            message,
            account: this.comethSmartAccountClient.account
        })
    }

    private async handleEthSignTypedDataV4(
        params: [string, string]
    ): Promise<string> {
        if (!this.comethSmartAccountClient?.account) {
            throw new Error("account not connected!")
        }
        const [address, typedDataJSON] = params
        const typedData = JSON.parse(typedDataJSON)
        if (
            address.toLowerCase() !==
            this.comethSmartAccountClient.account.address.toLowerCase()
        ) {
            throw new Error(
                "cannot sign for address that is not the current account"
            )
        }

        return this.comethSmartAccountClient.signTypedData({
            account: this.comethSmartAccountClient.account,
            domain: typedData.domain,
            types: typedData.types,
            message: typedData.message,
            primaryType: typedData.primaryType
        })
    }

    private async handleSwitchEthereumChain() {
        throw new Error("Not implemented.")
    }

    private async handleWalletSendcalls(
        params: [SendCallsParams]
    ): Promise<SendCallsResult> {
        const accountAddress = this.comethSmartAccountClient.account.address
        const accountChainId = this.comethSmartAccountClient.chain.id

        console.log("accountAddress", accountAddress)
        console.log("accountChainId", accountChainId)

        const { calls, capabilities, from, chainId } = params[0]
        if (from !== accountAddress) {
            throw new Error("invalid account address")
        }
        if (Number(chainId) !== accountChainId) {
            throw new Error("invalid chain id")
        }
        if (
            this.comethSmartAccountClient.account.entryPoint.address !== ENTRYPOINT_ADDRESS_V07 &&
            capabilities?.permissions
        ) {
            throw new Error("Permissions not supported")
        }

        return await this.comethSmartAccountClient.sendUserOperation({
            calls: calls.map((call) => ({
                to: call.to ?? this.comethSmartAccountClient.account.address,
                value: call.value ? BigInt(call.value) : 0n,
                data: call.data ?? "0x"
            }))
        })
    }

    private handleWalletCapabilities() {
        const capabilities = this.capabilities as Record<string, any> | undefined

        return capabilities
            ? capabilities[this.comethSmartAccountClient.account.address]
            : {}
    }

    private async handleWalletGetCallStatus(
        params: [GetCallsParams]
    ): Promise<GetCallsResult> {
        const userOpHash = params[0]

        if (!isHex(userOpHash)) {
            throw new Error(
                "Invalid params for wallet_getCallStatus: not a hex string"
            )
        }
        const result = await this.comethSmartAccountClient.waitForUserOperationReceipt({
            hash: userOpHash as Hex
        })
        if (!result?.success) {
            return {
                status: "PENDING"
            }
        }
        return {
            status: "CONFIRMED",
            receipts: [
                {
                    logs: result.logs.map((log) => ({
                        address: log.address,
                        data: log.data,
                        topics: log.topics
                    })),
                    status: result.success ? "0x1" : "0x0",
                    blockHash: result.receipt.blockHash,
                    blockNumber: toHex(result.receipt.blockNumber),
                    gasUsed: toHex(result.receipt.gasUsed),
                    transactionHash: result.receipt.transactionHash
                }
            ]
        }
    }

    private async handleWalletGrantPermissions(
        params: [PermissionRequest]
    ) {
        if (this.comethSmartAccountClient.account.entryPoint.address !== ENTRYPOINT_ADDRESS_V07) {
            throw new Error("Permissions not supported")
        }


        const safe7559Account = this.comethSmartAccountClient
            .extend(smartSessionActions())
            .extend(erc7579Actions());

        const capabilities = this.handleWalletCapabilities()[toHex(this.comethSmartAccountClient.chain.id)]
            .permissions

        if (!capabilities.signerTypes.includes(params[0].signer.type)) {
            throw new Error("Invalid signer type: must be one of the allowed types");
        }

        validatePermissions(params[0], capabilities.permissionTypes)
        const permissions = params[0].permissions   

        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (!params[0].expiry) {
            throw new Error("Invalid expiry: expiry is required");
        }
        
        const sessionDuration = params[0].expiry - currentTimestamp;
        
        if (sessionDuration <= 0) {
            throw new Error("Invalid expiry: expiry must be in the future");
        }

        const sessionRequestedInfo: CreateSessionDataParams[] = permissions.map((permission) => {
            let actionPoliciesInfo: ActionPolicyInfo[] = [];
        
            switch (permission.type) {
                case "sudo":
                    break;
        
                case "contract-call":
                    actionPoliciesInfo.push({
                        contractAddress: permission.data.contractAddress as Hex,
                        ...(permission.data.validUntil && { validUntil: Number(permission.data.validUntil) }),
                        ...(permission.data.validAfter && { validAfter: Number(permission.data.validAfter) }),
                        ...(permission.data.functionSelector && { functionSelector: toFunctionSelector(permission.data.functionSelector) as Hex }),
                        ...(permission.data.valueLimit && { valueLimit: BigInt(permission.data.valueLimit) }),
                        ...(permission.data.tokenLimits && {
                            tokenLimits: permission.data.tokenLimits.map((tokenLimit: { token: string; limit: string }) => ({
                                token: tokenLimit.token as Hex,
                                limit: BigInt(tokenLimit.limit),
                            })),
                        }),
                        ...(permission.data.usageLimit && { usageLimit: BigInt(permission.data.usageLimit) }),
                        ...(permission.data.sudo !== undefined && { sudo: permission.data.sudo }),
                        ...(permission.data.abi && { abi: permission.data.abi }),
                        ...(permission.data.rules && { rules: permission.data.rules }),
                    });
                    break;
        
                default:
                    throw new Error(`Unsupported permission type: ${permission.type}`);
            }

            //TODO: adapt response type to ERC-7715
            return {
                sessionPublicKey: params[0].signer.data.address,
                sessionValidUntil: params[0].expiry,
                sessionValidAfter: currentTimestamp,
                chainIds: [BigInt(params[0].chainId)],
                actionPoliciesInfo,
            };
        });

        const grantPermissionParams: GrantPermissionParameters<ComethSafeSmartAccount> = {
            sessionRequestedInfo,
        };



        const createSessionsResponse = await safe7559Account.grantPermission(grantPermissionParams);

        const response = await safe7559Account.waitForUserOperationReceipt({
            hash: createSessionsResponse.userOpHash,
        });


        return {
            grantedPermissions: permissions.map((permission) => ({
                type: permission.type,
                data: permission.data,
            })),
            expiry: params[0].expiry,
            txHash: response.receipt.transactionHash,
            createSessionsResponse,
        }
    }
}

        //TODO:
        //Store in localStorage?
