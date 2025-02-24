import { ExpiryInPastError, UnsupportedPolicyError } from "@/errors"
import type { PermissionRequest } from "../types"

export const validatePermissions = (
    permissionsParams: PermissionRequest,
    supportedPolicies: string[]
) => {
    // check expiry
    if (permissionsParams.expiry < Math.floor(Date.now() / 1000)) {
        throw new ExpiryInPastError()
    }

    // check policies are supported
    for (const permission of permissionsParams.permissions) {
        if (!supportedPolicies.includes(permission.type)) {
            throw new UnsupportedPolicyError(permission.type)
        }
    }
}