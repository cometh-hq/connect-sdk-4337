import { getDeviceData } from "@/core/services/deviceService";
import { isTauri } from "@/core/services/tauri/platform";
import type { WebAuthnP256 } from "ox";

type BrowserGetFn = NonNullable<WebAuthnP256.sign.Options["getFn"]>;

// Chrome 153 on Android fills omitted allowCredentials transports with every
// known transport, including smart-card, which GMS Core cannot decode and hangs
// on (crbug.com/555599813). This is the Chrome 152 default list without it.
const ANDROID_DEFAULT_TRANSPORTS: AuthenticatorTransport[] = [
    "usb",
    "ble",
    "nfc",
    "hybrid",
    "internal",
];

export const withExplicitTransports = (
    options: CredentialRequestOptions
): CredentialRequestOptions => {
    const { publicKey } = options;
    if (!publicKey?.allowCredentials?.length) return options;

    return {
        ...options,
        publicKey: {
            ...publicKey,
            allowCredentials: publicKey.allowCredentials.map((descriptor) =>
                descriptor.transports?.length
                    ? descriptor
                    : { ...descriptor, transports: ANDROID_DEFAULT_TRANSPORTS }
            ),
        },
    };
};

const isAndroidBrowser = (): boolean => {
    if (typeof window === "undefined" || isTauri()) return false;
    return getDeviceData().os === "Android";
};

export const getAndroidBrowserGetFn = (): BrowserGetFn | undefined => {
    if (!isAndroidBrowser()) return undefined;

    const nativeGet = window.navigator.credentials.get.bind(
        window.navigator.credentials
    );

    return (options) =>
        options ? nativeGet(withExplicitTransports(options)) : nativeGet();
};
