import { afterEach, describe, expect, test } from "bun:test";
import {
    withAndroidTransports,
    withExplicitTransports,
} from "./androidTransports";

const challenge = new Uint8Array([1, 2, 3]);
const credentialId = new Uint8Array([9, 9, 9]);

const requestWith = (
    descriptor: Partial<PublicKeyCredentialDescriptor>
): CredentialRequestOptions => ({
    publicKey: {
        challenge,
        rpId: "example.com",
        userVerification: "required",
        allowCredentials: [
            { type: "public-key", id: credentialId, ...descriptor },
        ],
    },
});

describe("withExplicitTransports", () => {
    test("adds the default transports when transports are omitted", () => {
        const result = withExplicitTransports(requestWith({}));

        expect(result.publicKey?.allowCredentials?.[0].transports).toEqual([
            "usb",
            "ble",
            "nfc",
            "hybrid",
            "internal",
        ]);
    });

    test("treats an empty transports list like an omitted one", () => {
        const result = withExplicitTransports(requestWith({ transports: [] }));

        expect(result.publicKey?.allowCredentials?.[0].transports).toEqual([
            "usb",
            "ble",
            "nfc",
            "hybrid",
            "internal",
        ]);
    });

    test("keeps an explicit non-empty transports list", () => {
        const result = withExplicitTransports(
            requestWith({ transports: ["internal"] })
        );

        expect(result.publicKey?.allowCredentials?.[0].transports).toEqual([
            "internal",
        ]);
    });

    test("returns the request untouched without allowCredentials", () => {
        const options: CredentialRequestOptions = {
            publicKey: { challenge, rpId: "example.com" },
        };

        expect(withExplicitTransports(options)).toBe(options);
    });

    test("preserves every other request field by reference", () => {
        const signal = new AbortController().signal;
        const options = requestWith({});
        options.signal = signal;

        const result = withExplicitTransports(options);

        expect(result.signal).toBe(signal);
        expect(result.publicKey?.challenge).toBe(challenge);
        expect(result.publicKey?.rpId).toBe("example.com");
        expect(result.publicKey?.userVerification).toBe("required");
        expect(result.publicKey?.allowCredentials?.[0].id).toBe(credentialId);
    });
});

const ANDROID_CHROME_UA =
    "Mozilla/5.0 (Linux; Android 14; M2012K11G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.36 Mobile Safari/537.36";
const MAC_CHROME_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.36 Safari/537.36";

const stubBrowserWindow = (userAgent: string) => {
    globalThis.window = {
        location: { hostname: "example.com", protocol: "https:" },
        navigator: { userAgent },
    } as unknown as Window & typeof globalThis;
};

describe("withAndroidTransports", () => {
    afterEach(() => {
        Reflect.deleteProperty(globalThis, "window");
    });

    test("injects transports in an Android browser", () => {
        stubBrowserWindow(ANDROID_CHROME_UA);

        const result = withAndroidTransports(requestWith({}));

        expect(result.publicKey?.allowCredentials?.[0].transports).toEqual([
            "usb",
            "ble",
            "nfc",
            "hybrid",
            "internal",
        ]);
    });

    test("leaves the request untouched on desktop", () => {
        stubBrowserWindow(MAC_CHROME_UA);
        const options = requestWith({});

        expect(withAndroidTransports(options)).toBe(options);
    });

    test("leaves the request untouched outside a browser", () => {
        const options = requestWith({});

        expect(withAndroidTransports(options)).toBe(options);
    });
});
