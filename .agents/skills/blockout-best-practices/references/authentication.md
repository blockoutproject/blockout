# Authentication And Session Policy

Apply this policy to Auth0, OIDC, login, logout, token storage, authenticated mobile requests, identity propagation, or authorization.

## Provider And Identity Boundary

- Use the configured Auth0 tenant as the OpenID Connect provider through the official native SDK.
- Register the mobile application as a public native client. Use authorization code flow with PKCE, the system browser, exact callback allowlists, and validated issuer and audience values.
- Key external identities by `(issuer, subject)` and map them to a stable Blockout user. Never key identity by email.
- Keep credentials, federation, and authentication assurance in Auth0. Keep Blockout roles, permissions, subscriptions, ownership, grants, and resource-state rules in the owning Blockout service.
- Never treat hidden controls, route guards, or token claims alone as product authorization. The service that owns current domain state enforces access.

## Tokens And Requests

- Let `react-native-auth0` own the native authentication flow and credential lifecycle. Do not add a parallel OAuth implementation.
- Store credentials only through platform-protected storage. Never put access, ID, or refresh tokens in AsyncStorage, application state persisted to disk, URLs, logs, analytics, screenshots, or test fixtures.
- Attach a current access token only at the API boundary and only to the intended audience. Never forward a client-supplied actor as trusted internal identity.
- Return or handle `401` for missing or expired authentication and `403` for an authenticated actor lacking current authority. Preserve distinct recovery behavior.
- Clear local application session state even when provider logout is cancelled or unavailable; surface the remaining SSO state accurately.
- Validate any deep link or post-login destination against explicit application routes.

## Privacy And Verification

- Do not log tokens, authorization codes, cookies, credentials, raw identity claims, provider responses, or personal profile data.
- Keep secrets out of `EXPO_PUBLIC_*` configuration. Public native client identifiers and callback schemes are not secrets.
- Cover successful login, cancellation, provider failure, credential refresh, expired credentials, local logout, SSO logout failure, unauthorized and forbidden API responses, safe deep links, and the absence of tokens from logs and persisted application data.
