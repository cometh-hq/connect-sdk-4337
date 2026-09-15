---
"@cometh/connect-sdk-4337": patch
---

Pass explicit WebAuthn transports in passkey signing requests on Android browsers. Chrome 153 fills omitted `allowCredentials[].transports` with `smart-card`, which makes Google Play Services hang and leaves `signMessage` / `signUserOperation` pending forever (crbug.com/555599813). Applies to both the Safe WebAuthn signer and the legacy migration kit signer.
