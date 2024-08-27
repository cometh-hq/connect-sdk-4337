import { EventEmitter } from "events"
import {
    deserializePermissionAccount,
    serializePermissionAccount,
    toPermissionValidator
} from "@zerodev/permissions"
import { toECDSASigner } from "@zerodev/permissions/signers"
import type { ComethSmartAccountClient, KernelSmartAccount } from "@zerodev/sdk"
import { createKernelAccount, createComethSmartAccountClient } from "@zerodev/sdk"
import type { SponsorUserOperationReturnType } from "@zerodev/sdk/actions"
import { createZeroDevPaymasterClient } from "@zerodev/sdk/clients"
import {
    type BundlerClient,
    ENTRYPOINT_ADDRESS_V07,
    type EstimateUserOperationGasReturnType,
    bundlerActions
} from "permissionless"
import {
    type GetPaymasterDataParameters,
    type GetPaymasterDataReturnType,
    type GetPaymasterStubDataReturnType,
    paymasterActionsEip7677
} from "permissionless/experimental"
import type {
    ENTRYPOINT_ADDRESS_V07_TYPE,
    EntryPoint,
    GetEntryPointVersion,
    UserOperation
} from "permissionless/types"
import type {
    Chain,
    Client,
    EIP1193Parameters,
    EIP1193RequestFn,
    Hash,
    SendTransactionParameters,
    Transport
} from "viem"
import { http, type Hex, isHex, toHex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { ConnectLocalStorage } from "./utils/storage"
import type { GetCallsParams, GetCallsResult, GrantPermissionsParams, PaymasterServiceCapability, SendCallsParams, SendCallsResult, SessionType } from "./types"

const WALLET_CAPABILITIES_STORAGE_KEY = "WALLET_CAPABILITIES"
const WALLET_PERMISSION_STORAGE_KEY = "WALLET_PERMISSION"

export class ConnectEIP1193Provider<
    entryPoint extends EntryPoint
> extends EventEmitter {
    private readonly storage = new ConnectLocalStorage("CONNECT_WALLET")
    private smartAccountClient: ComethSmartAccountClient<
        entryPoint,
        Transport,
        Chain,
        KernelSmartAccount<entryPoint>
    >
    private bundlerClient: BundlerClient<entryPoint>

    constructor(smartAccountClient: ComethSmartAccountClient<entryPoint>) {
        super()
        if (
            typeof smartAccountClient.account !== "object" ||
            typeof smartAccountClient.chain !== "object"
        ) {
            throw new Error("invalid connect client")
        }
        this.smartAccountClient = smartAccountClient as ComethSmartAccountClient<
            entryPoint,
            Transport,
            Chain,
            KernelSmartAccount<entryPoint>
        >

        const permissions = {}
            

        const capabilities = {
            [smartAccountClient.account.address]: {
                [toHex(smartAccountClient.chain.id)]: {
                    atomicBatch: {
                        supported: true
                    },
                    paymasterService: {
                        supported: true
                    },
                    permissions
                }
            }
        }
        this.storeItemToStorage(WALLET_CAPABILITIES_STORAGE_KEY, capabilities)
        this.bundlerClient = smartAccountClient.extend(
            bundlerActions(smartAccountClient.account.entryPoint)
        )
    }

    getChainId() {
        return this.handleGetChainId()
    }

    async request({
        method,
        params = []
    }: EIP1193Parameters): ReturnType<EIP1193RequestFn> {
        switch (method) {
            case "eth_chainId":
                return this.handleGetChainId()
            case "eth_requestAccounts":
                return this.handleEthRequestAccounts()
            case "eth_accounts":
                return this.handleEthAccounts()
            case "eth_sendTransaction":
                return this.handleEthSendTransaction(params)
            case "eth_sign":
                return this.handleEthSign(params as [string, string])
            case "personal_sign":
                return this.handlePersonalSign(params as [string, string])
            case "eth_signTypedData":
            case "eth_signTypedData_v4":
                return this.handleEthSignTypedDataV4(params as [string, string])
            case "wallet_getCapabilities":
                return this.handleWalletCapabilities()
            case "wallet_sendCalls":
                return this.handleWalletSendcalls(params as [SendCallsParams])
            case "wallet_getCallsStatus":
                return this.handleWalletGetCallStatus(
                    params as [GetCallsParams]
                )
            case "wallet_grantPermissions":
                return this.handleWalletGrantPermissions(
                    params as [GrantPermissionsParams]
                )
            case "wallet_switchEthereumChain":
                return this.handleSwitchEthereumChain()
            default:
                return this.smartAccountClient.transport.request({ method, params })
        }
    }

    private handleGetChainId() {
        return this.smartAccountClient.chain.id
    }

    private async handleEthRequestAccounts(): Promise<string[]> {
        if (!this.smartAccountClient.account) {
            return []
        }
        return [this.smartAccountClient.account.address]
    }

    private async handleEthAccounts(): Promise<string[]> {
        if (!this.smartAccountClient.account) {
            return []
        }
        return [this.smartAccountClient.account.address]
    }

    private async handleEthSendTransaction(params: unknown): Promise<Hash> {
        const [tx] = params as [SendTransactionParameters]
        return this.smartAccountClient.sendTransaction(tx)
    }

    private async handleEthSign(params: [string, string]): Promise<string> {
        throw new Error("Not implemented.")
    }

    private async handlePersonalSign(
        params: [string, string]
    ): Promise<string> {
        throw new Error("Not implemented.")
    }

    private async handleEthSignTypedDataV4(
        params: [string, string]
    ): Promise<string> {
        throw new Error("Not implemented.")
    }

    private async handleSwitchEthereumChain() {
        throw new Error("Not implemented.")
    }

    private async handleWalletSendcalls(
        params: [SendCallsParams]
    ): Promise<SendCallsResult> {
        const accountAddress = this.smartAccountClient.account.address
        const accountChainId = this.smartAccountClient.chain.id

        const { calls, capabilities, from, chainId } = params[0]
        if (from !== accountAddress) {
            throw new Error("invalid account address")
        }
        if (Number(chainId) !== accountChainId) {
            throw new Error("invalid chain id")
        }

        let ComethSmartAccountClient: ComethSmartAccountClient<
            entryPoint,
            Transport,
            Chain,
            KernelSmartAccount<entryPoint>
        >
    

        const paymasterService = await this.getPaymasterService(
            capabilities?.paymasterService,
            this.smartAccountClient.chain
        )

      

        ComethSmartAccountClient = createComethSmartAccountClient({
            account: this.smartAccountClient.account,
            chain: this.smartAccountClient.chain,
            entryPoint: this.smartAccountClient.account.entryPoint,
            bundlerTransport: http(this.smartAccountClient.transport.url),
            middleware: {
                sponsorUserOperation: paymasterService
            }
        })
        

        const encodedeCall = await ComethSmartAccountClient.account.encodeCallData(
            calls.map((call) => ({
                to: call.to ?? ComethSmartAccountClient.account.address,
                value: call.value ? BigInt(call.value) : 0n,
                data: call.data ?? "0x"
            }))
        )

        return await ComethSmartAccountClient.sendUserOperation({
            userOperation: {
                callData: encodedeCall
            }
        })
    }

    private handleWalletCapabilities() {
        const capabilities = this.getItemFromStorage(
            WALLET_CAPABILITIES_STORAGE_KEY
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        ) as Record<string, any> | undefined

        return capabilities
            ? capabilities[this.smartAccountClient.account.address]
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
        const result = await this.bundlerClient.getUserOperationReceipt({
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
        params: [GrantPermissionsParams]
    ) {
        if (this.smartAccountClient.account.entryPoint !== ENTRYPOINT_ADDRESS_V07) {
            throw new Error("Permissions not supported with kernel v2")
        }
        const capabilities =
            this.handleWalletCapabilities()[toHex(this.smartAccountClient.chain.id)]
                .permissions.permissionTypes

        validatePermissions(params[0], capabilities)
        const policies = getPolicies(params[0])
        const permissions = params[0].permissions

        // signer
        const sessionPrivateKey = generatePrivateKey()
        const sessionKeySigner = toECDSASigner({
            signer: privateKeyToAccount(sessionPrivateKey)
        })

        const client = this.smartAccountClient.account.client as Client<
            Transport,
            Chain | undefined,
            undefined
        >

        const permissionValidator = await toPermissionValidator(client, {
            entryPoint: this.smartAccountClient.account.entryPoint,
            kernelVersion: this.smartAccountClient.account.kernelVersion,
            signer: sessionKeySigner,
            policies: policies
        })

        const sudoValidator =
            this.smartAccountClient.account.kernelPluginManager.sudoValidator
        const sessionKeyAccount = await createKernelAccount(client, {
            entryPoint: this.smartAccountClient.account.entryPoint,
            kernelVersion: this.smartAccountClient.account.kernelVersion,
            plugins: {
                sudo: sudoValidator,
                regular: permissionValidator
            }
        })
        const enabledSignature =
            await sessionKeyAccount.kernelPluginManager.getPluginEnableSignature(
                sessionKeyAccount.address
            )
        const sessionKeyAccountWithSig = await createKernelAccount(client, {
            entryPoint: this.smartAccountClient.account.entryPoint,
            kernelVersion: this.smartAccountClient.account.kernelVersion,
            plugins: {
                sudo: sudoValidator,
                regular: permissionValidator,
                pluginEnableSignature: enabledSignature
            }
        })

        const createdPermissions =
            this.getItemFromStorage(WALLET_PERMISSION_STORAGE_KEY) || {}
        const newPermission = {
            sessionId: permissionValidator.getIdentifier(),
            entryPoint: this.smartAccountClient.account.entryPoint,
            signerPrivateKey: sessionPrivateKey,
            approval: await serializePermissionAccount(sessionKeyAccountWithSig)
        }

        const address = this.smartAccountClient.account.address
        const chainId = toHex(this.smartAccountClient.chain.id)

        const mergedPermissions: SessionType = { ...createdPermissions }

        if (!mergedPermissions[address]) {
            mergedPermissions[address] = {}
        }

        if (!mergedPermissions[address][chainId]) {
            mergedPermissions[address][chainId] = []
        }

        mergedPermissions[address][chainId].push(newPermission)
        this.storeItemToStorage(
            WALLET_PERMISSION_STORAGE_KEY,
            mergedPermissions
        )
        return {
            grantedPermissions: permissions.map((permission) => ({
                type: permission.type,
                data: permission.data,
                policies: permission.policies
            })),
            expiry: params[0].expiry,
            permissionsContext: permissionValidator.getIdentifier()
        }
    }

    private async getPaymasterService(
        paymaster: PaymasterServiceCapability | undefined,
        chain: Chain
    ) {
        if (!paymaster?.url) return undefined

        // verifying paymaster
        return async ({
            userOperation,
            entryPoint
        }: {
            userOperation: UserOperation<GetEntryPointVersion<entryPoint>>
            entryPoint: entryPoint
        }) => {
            const paymasterClient = createZeroDevPaymasterClient({
                chain: chain,
                entryPoint: entryPoint,
                transport: http(paymaster.url)
            })
            const paymasterEip7677Client = paymasterClient.extend(
                paymasterActionsEip7677(entryPoint)
            )

            // 1. get stub data from paymasterService
            const stubData = await paymasterEip7677Client.getPaymasterStubData({
                userOperation: userOperation,
                chain: chain
            })
            const stubUserOperation = {
                ...userOperation,
                ...stubData
            }
            const hexStubUserOperation = Object.fromEntries(
                Object.entries(stubUserOperation).map(([key, value]) => {
                    if (typeof value === "bigint") return [key, toHex(value)]
                    return [key, value]
                })
            )

            // 2. estimate userOp gas
            const gas = (await this.smartAccountClient.request({
                method: "eth_estimateUserOperationGas",
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                params: [hexStubUserOperation as any, entryPoint]
            })) as EstimateUserOperationGasReturnType<entryPoint>

            const userOperationWithGas = {
                ...stubUserOperation,
                callGasLimit: gas.callGasLimit,
                verificationGasLimit: gas.verificationGasLimit,
                preVerificationGas: gas.preVerificationGas
            } as GetPaymasterDataParameters<entryPoint>["userOperation"]

            // 3. get paymaster data
            const paymasterData = await paymasterEip7677Client.getPaymasterData(
                {
                    userOperation: userOperationWithGas,
                    chain: chain
                }
            )

            const stubDataV07 =
                stubData as GetPaymasterStubDataReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>
            const paymasterDataV07 =
                paymasterData as GetPaymasterDataReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>

            return {
                callGasLimit: BigInt(gas.callGasLimit),
                verificationGasLimit: BigInt(gas.verificationGasLimit),
                preVerificationGas: BigInt(gas.preVerificationGas),
                paymaster: paymasterDataV07.paymaster,
                paymasterData: paymasterDataV07.paymasterData,
                paymasterVerificationGasLimit:
                    stubDataV07.paymasterVerificationGasLimit &&
                    BigInt(stubDataV07.paymasterVerificationGasLimit),
                paymasterPostOpGasLimit:
                    stubDataV07?.paymasterPostOpGasLimit &&
                    BigInt(stubDataV07.paymasterPostOpGasLimit),
                maxFeePerGas: BigInt(userOperation.maxFeePerGas),
                maxPriorityFeePerGas: BigInt(userOperation.maxPriorityFeePerGas)
            } as SponsorUserOperationReturnType<entryPoint>
        }
    }

    private getItemFromStorage<T>(key: string): T | undefined {
        const item = this.storage.getItem(key)
        return item ? JSON.parse(item) : undefined
    }

    private storeItemToStorage<T>(key: string, item: T) {
        this.storage.setItem(key, JSON.stringify(item))
    }
}
