# Auth0 Authentication Flow Audit

Use this runbook to inspect Blockout's Auth0 mobile and backend flow without changing code, tenant configuration,
credentials, callbacks, or sessions.

## Authority

Read the Expo mobile, backend Java, REST endpoint, logging, local-runtime, and mobile-testing policies. Current Blockout
source and explicitly documented Auth0 configuration own behavior; Maaatch's Logto flow supplies procedure shape only.

## Procedure

1. Inventory the mobile authorization-code-with-PKCE flow, secure token storage, refresh/logout behavior, callback
   handling, issuer/audience validation, and authenticated API propagation.
2. Trace one success, cancellation, expired-token, revoked-session, invalid-audience, offline, and logout path across
   mobile, mobile-gateway, and owning services.
3. Check for:
   - implicit flow, client secrets in mobile, wildcard callbacks, or disabled PKCE;
   - tokens in logs, AsyncStorage, plain files, URLs, fixtures, screenshots, or error copy;
   - missing issuer, audience, signature, expiry, or scope validation;
   - client-supplied identity trusted over validated claims;
   - refresh races, stale authenticated cache, incomplete logout, or bypasses used by tests;
   - platform callback differences that break iOS or Android;
   - unstable provider errors exposed directly to users.
4. Inspect tests and local setup without authenticating to production or changing the Auth0 tenant.
5. Revalidate each candidate against current configuration and deduplicate active work.

## Publication And Result

Publish only current, actionable, non-sensitive findings in a separate mutation phase. Use one issue per coherent
security or correctness boundary, with safe reproduction, Workset, acceptance evidence, and severity. Otherwise report
a no-op. Never include tokens, secrets, personal data, or tenant exports.
