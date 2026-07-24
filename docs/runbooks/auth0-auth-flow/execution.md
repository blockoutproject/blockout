# Auth0 Authentication Flow Execution

Use this runbook only for an explicitly approved and claimed Auth0 finding.

## Preconditions

- Revalidate the finding without exposing or rotating credentials.
- Confirm whether code, mobile native configuration, environment documentation, or external tenant state owns the fix.
- Obtain new user authority before any Auth0 tenant mutation not already explicit in the issue.
- Preserve the current provider and native SDK; do not replace authentication architecture incidentally.

## Procedure

1. Correct the smallest owning boundary: PKCE/callback configuration, secure storage, token lifecycle, claim validation,
   identity propagation, cache clearing, error translation, or focused test seam.
2. Keep secrets in the authorized environment and official provider configuration.
3. Never add a local, simulator, E2E, CI, or debug authentication bypass.
4. Avoid custom OAuth clients, token parsers, refresh managers, or global auth frameworks when official SDK behavior and
   a focused adapter suffice.
5. Test safe failure paths without calling production or committing session material.

## Validation And Delivery

- Run focused mobile and backend tests for the changed boundary.
- Run mobile lint, typecheck, Jest, and an iOS/Android native check when callback or native configuration changes.
- Run affected backend module tests and the reactor for shared security configuration.
- Finish with format checks and `git diff --check`.
- Publish through the task execution runbook and clearly separate any external tenant action still requiring approval.
