import type {
    EnableSessionData,
    Session,
    SmartSessionMode,
} from "@rhinestone/module-sdk";
import type { Abi, AbiFunction, Address, ByteArray, Hex, OneOf } from "viem";

export type Execution = {
    target: Address;
    value: bigint;
    callData: Hex;
};

/**
 * Represents a hardcoded hex value reference.
 * Used when you want to bypass automatic hex conversion.
 */
export type HardcodedReference = {
    /** The raw hex value */
    raw: Hex;
};
/**
 * Base types that can be converted to hex references.
 */
type BaseReferenceValue = string | number | bigint | boolean | ByteArray;
/**
 * Union type of all possible reference values that can be converted to hex.
 * Includes both basic types and hardcoded references.
 */
export type AnyReferenceValue = BaseReferenceValue | HardcodedReference;

export type PreparePermissionResponse = {
    /** Array of permission IDs for the created sessions. */
    permissionIds: Hex[];
    /** The execution object for the action. */
    action: Execution;
    /** The sessions that were created. */
    sessions: Session[];
};
/**
 * Represents the response for creating sessions.
 */
export type GrantPermissionResponse = {
    /** The hash of the user operation. */
    userOpHash: Hex;
} & PreparePermissionResponse;

export type RemovePermissionResponse = {
    /** The hash of the user operation. */
    userOpHash: Hex;
    /** The permission ID for the removing session. */
    permissionId: Hex;
    /** The execution object for the action. */
    action: Execution;
};

export type Call = {
    to: Hex;
    data?: Hex | undefined;
    value?: bigint | undefined;
};

type OptionalSessionKeyData = OneOf<
    | {
          /** Public key for the session. Required for K1 algorithm validators. */
          sessionPublicKey: Hex;
      }
    | {
          /** Data for the session key. */
          sessionKeyData: Hex;
      }
>;

/**
 * Represents a rule for action policies.
 */
export type Rule = {
    /** The condition to apply to the parameter */
    condition: ParamCondition;
    /** The offset index in the calldata where the value to be checked is located */
    offsetIndex: number;
    /** Indicates if the rule has a usage limit */
    isLimited: boolean;
    /** The reference value to compare against */
    ref: AnyReferenceValue;
    /** The usage object containing limit and used values (required if isLimited is true) */
    usage: LimitUsage;
};

export type ActionPolicyInfo = {
    /** The address of the contract to be included in the policy */
    contractAddress: Hex;
    /** The timeframe policy can be used to restrict a session to only be able to be used within a certain timeframe */
    validUntil?: number;
    /** Timestamp after which the policy becomes valid */
    validAfter?: number;
    /** The value limit policy can be used to enforce that only a certain amount of native value can be spent. For ERC-20 limits, use the spending limit policy */
    valueLimit?: bigint;
    /** The spending limits policy can be used to ensure that only a certain amount of ERC-20 tokens can be spent. For native value spends, use the value limit policy */
    tokenLimits?: SpendingLimitPolicyData[];
    /** The value limit policy can be used to enforce that only a certain amount of native value can be spent. For ERC-20 limits, use the spending limit policy. */
    usageLimit?: bigint;
    /** The sudo policy is an action policy that will allow any action for the specified target and selector. */
    sudo?: boolean;
} & OneOf<
    | {
          /** The specific function selector from the contract to be included in the policy */
          functionSelector: string | AbiFunction;
          /** Array of rules for the policy */
          rules?: Rule[];
      }
    | {
          /** The ABI of the contract to be included in the policy */
          abi: Abi;
      }
>;

/**
 * Parameters for creating a session.
 */
export type CreateSessionDataParams = OptionalSessionKeyData & {
    /** Public key for the session. Required for K1 algorithm validators. */
    sessionPublicKey?: Hex;
    /** Address of the session validator. */
    sessionValidator?: Address;
    /** Data for the session validator. */
    sessionValidatorInitData?: Hex;
    /** Optional salt for the session. */
    salt?: Hex;
    /** Timestamp until which the session is valid. */
    sessionValidUntil?: number;
    /** Timestamp after which the session becomes valid. */
    sessionValidAfter?: number;
    /** Chain IDs where the session should be enabled. Useful for enable mode. */
    chainIds?: bigint[];
    /** Array of action policy data for the session. */
    actionPoliciesInfo?: ActionPolicyInfo[];
};

export declare enum ParamCondition {
    EQUAL = 0,
    GREATER_THAN = 1,
    LESS_THAN = 2,
    GREATER_THAN_OR_EQUAL = 3,
    LESS_THAN_OR_EQUAL = 4,
    NOT_EQUAL = 5,
}

export type SpendingLimitPolicyData = {
    /** The address of the token to be included in the policy */
    token: Address;
    /** The limit for the token */
    limit: bigint;
};

/**
 * Represents the usage limit for a rule.
 */
export type LimitUsage = {
    limit: bigint;
    used: bigint;
};

/**
 * Represents the possible modes for a smart session.
 */
export type SmartSessionModeType =
    (typeof SmartSessionMode)[keyof typeof SmartSessionMode];

/**
 * Represents the data structure for using a session module.
 */
export type UsePermissionModuleData = {
    /** The mode of the smart session. */
    mode?: SmartSessionModeType;
    /** Data for enabling the session. */
    enableSessionData?: EnableSessionData;
    /** The index of the permission ID to use for the session. Defaults to 0. */
    permissionIdIndex?: number;
} & PreparePermissionResponse;

export type FullCreateSessionDataParams = {
    /** Public key for the session. Required for K1 algorithm validators. */
    sessionPublicKey: Hex;
    /** Address of the session validator. */
    sessionValidator?: Address;
    /** Data for the session validator. */
    sessionValidatorInitData?: Hex;
    /** Data for the session key. */
    sessionKeyData: Hex;
    /** Optional salt for the session. */
    salt?: Hex;
    /** Timestamp until which the session is valid. */
    sessionValidUntil: number;
    /** Timestamp after which the session becomes valid. */
    sessionValidAfter: number;
    /** Chain IDs where the session should be enabled. Useful for enable mode. */
    chainIds?: bigint[];
    /** Array of action policy data for the session. */
    actionPoliciesInfo: ActionPolicyInfo[];
};

export type ResolvedActionPolicyInfo = ActionPolicyInfo & {
    functionSelector: string | AbiFunction;
};
