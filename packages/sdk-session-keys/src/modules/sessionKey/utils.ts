import {
    type ActionData,
    OWNABLE_VALIDATOR_ADDRESS,
    type PolicyData,
    encodeValidationData,
} from "@rhinestone/module-sdk";
import {
    type Abi,
    type AbiFunction,
    type Address,
    type Hex,
    getAddress,
    toBytes,
    toFunctionSelector,
    toHex,
} from "viem";
import type {
    ActionPolicyInfo,
    CreateSessionDataParams,
    FullCreateSessionDataParams,
    ResolvedActionPolicyInfo,
} from "./types";

export const ONE_YEAR_FROM_NOW_IN_SECONDS = Date.now() + 60 * 60 * 24 * 365;

/**
 * Applies default values to a CreateSessionDataParams object.
 *
 * @param sessionInfo - The CreateSessionDataParams object to apply defaults to.
 * @returns A FullCreateSessionDataParams object with default values applied.
 */
export const applyDefaults = (
    sessionInfo: CreateSessionDataParams
): FullCreateSessionDataParams => {
    const sessionKeyData =
        sessionInfo.sessionKeyData ??
        toHex(toBytes(sessionInfo.sessionPublicKey));
    const sessionPublicKey = sessionInfo.sessionPublicKey ?? sessionKeyData;
    return {
        ...sessionInfo,
        sessionKeyData,
        sessionPublicKey,
        sessionValidUntil:
            sessionInfo.sessionValidUntil ?? ONE_YEAR_FROM_NOW_IN_SECONDS,
        sessionValidAfter: sessionInfo.sessionValidAfter ?? 0,
        sessionValidator:
            sessionInfo.sessionValidator ?? OWNABLE_VALIDATOR_ADDRESS,
        sessionValidatorInitData:
            sessionInfo.sessionValidatorInitData ??
            encodeValidationData({
                threshold: 1,
                owners: [getAddress(sessionPublicKey)],
            }),
        actionPoliciesInfo: sessionInfo.actionPoliciesInfo ?? [],
    };
};

/**
 * Generates a random salt as a hexadecimal string.
 *
 * @returns A 32-byte hexadecimal string prefixed with '0x'.
 */
export const generateSalt = (): Hex => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return `0x${Array.from(randomBytes, (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("")}` as Hex;
};

/**
 * Converts an ABI to a list of ActionPolicyInfo objects.
 *
 * @param params - The parameters object
 * @param params.abi - The ABI to convert
 * @param params.actionPolicyInfo - The ActionPolicyInfo object to apply to each function in the ABI
 *
 * @example
 * const actionPoliciesInfo = abiToPoliciesInfo({
 *   abi: CounterAbi,
 *   actionPolicyInfo: {
 *     contractAddress: testAddresses.Counter,
 *     sudo: false,
 *     tokenLimits: [],
 *     usageLimit: 1000n,
 *     valueLimit: 1000n
 *   }
 * })
 * @returns An array of ActionPolicyInfo objects
 */

export type AbiToPoliciesInfoParams = Omit<
    ActionPolicyInfo,
    "functionSelector" | "rules"
> & { abi: Abi };

export const abiToPoliciesInfo = ({
    abi,
    ...actionPolicyInfo
}: AbiToPoliciesInfoParams): ResolvedActionPolicyInfo[] =>
    (abi ?? [])
        .filter((item): item is AbiFunction => item.type === "function")
        .map((func) => ({
            ...actionPolicyInfo,
            functionSelector: toFunctionSelector(func),
            rules: [], // Rules should not be available here because they should be custom per method, not used in a loop
        }));

/**
 * Creates an ActionData object.
 *
 * @param contractAddress - The address of the contract.
 * @param functionSelector - The function selector or AbiFunction.
 * @param policies - An array of PolicyData objects.
 * @returns An ActionData object.
 */
export const createActionData = (
    contractAddress: Address,
    functionSelector: string | AbiFunction,
    policies: PolicyData[]
): ActionData => {
    return {
        actionTarget: contractAddress,
        actionTargetSelector: (typeof functionSelector === "string"
            ? functionSelector
            : functionSelector.name) as Hex,
        actionPolicies: policies,
    };
};
