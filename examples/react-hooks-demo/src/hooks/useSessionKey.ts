import { sessionKeyStore } from "@/store/sessionKeyStore";

export function useSessionKey() {
    const { permission, privateKey, setPermission } = sessionKeyStore();

    return {
        permission,
        privateKey,
        setPermission,
    };
}
