import { SmartSessionMode } from "@rhinestone/module-sdk";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { smartSessionActions } from "./modules/sessionKey/decorators";
import type { GrantPermissionParameters } from "./modules/sessionKey/decorators/grantPermission";
import type { UsePermissionParameters } from "./modules/sessionKey/decorators/usePermission";
import { toSmartSessionsAccount } from "./modules/sessionKey/toSmartSessionAccount";
import { toSmartSessionsSigner } from "./modules/sessionKey/toSmartSessionsSigner";
import type {
    ActionPolicyInfo,
    CreateSessionDataParams,
    Execution,
    GrantPermissionResponse,
} from "./modules/sessionKey/types";
import type {
    SafeSigner,
    SmartSessionsAccountClient,
} from "./modules/sessionKey/types";

export {
    erc7579Actions,
    smartSessionActions,
    toSmartSessionsSigner,
    toSmartSessionsAccount,
    SmartSessionMode,
};

export type {
    ActionPolicyInfo,
    GrantPermissionParameters,
    UsePermissionParameters,
    CreateSessionDataParams,
    Execution,
    GrantPermissionResponse,
    SafeSigner,
    SmartSessionsAccountClient,
};
