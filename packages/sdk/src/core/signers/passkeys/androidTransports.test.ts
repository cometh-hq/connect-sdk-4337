import { describe, expect, test } from "bun:test";
import { withExplicitTransports } from "./androidTransports";

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
