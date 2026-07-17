# MRG-353 Expo Case-Conversion Retirement

- Status: implemented in the monorepo baseline
- Owner: Expo mobile API transport
- Canonical wire format: camelCase
- Retained compatibility format: server-side MRG-304 v1 adapter snake_case
- Production effect: none

## Purpose

MRG-353 removes the Expo-wide request and response casing machinery after every current mobile-gateway v2 operation
has moved behind the contract-generated Orval client. The current contract contains fifty generated operations, and
active Expo application source imports generated endpoint, model, and schema modules instead of handwritten resource
clients.

This task changes no form implementation. It also does not remove the released-mobile compatibility contract: older
mobile releases continue to use the server-side v1 BFF adapter established by MRG-352 and retained until the MRG-304
production gate closes.

## Removed Surface

The following dead handwritten transport files are removed:

- `api/core/HttpClient.ts`, including deep request snake-casing, deep response camel-casing, and the `transformCase`
  option;
- `api/core/BaseApi.ts`, whose resource clients were already retired; and
- `api/core/ApiRegistry.ts`, which had no source consumer.

The unused `appendJsonSnake` multipart helper is removed from `utils.ts`. Generated multipart operations already build
canonical camelCase payloads and the React Native file-shape helper remains unchanged.

The mobile workspace and root lockfile no longer contain:

- `axios-case-converter`;
- `camelcase-keys`; or
- `snakecase-keys`.

Their now-unreachable transitive packages are removed from the lockfile when no other workspace owner requires them.

## Canonical Runtime Boundary

`orvalAxios` remains the single mobile-gateway v2 transport mutator. It owns:

- bearer-token attachment;
- repeated query-parameter serialization;
- request cancellation; and
- `ApiError` normalization plus unauthorized-session cleanup.

The mutator does not rename request bodies, query parameters, response bodies, headers, or multipart fields. The
generated client therefore sends and receives contract-authored camelCase without a hidden conversion layer. The
shared `TokenSupplier` type moves into this active mutator so the deleted transport leaves no compatibility import.

The temporary `MobileGatewayApi` provider shell is retained only to preserve the current context interface; it owns no
HTTP client or casing behavior. Its later structural retirement is outside MRG-353.

## Compatibility Evidence

- The generated mobile-gateway specification contains fifty v2 operations.
- Active application source imports generated endpoints, models, and Zod schemas for BFF workflows.
- No mobile source, manifest, or lockfile reference remains for `transformCase`, `appendJsonSnake`, the three deleted
  transport classes, or the three case-conversion packages.
- The Orval mutator forwards canonical request configuration and response data unchanged while preserving auth and
  error behavior.
- Generated-client verification, contract tests, mobile typecheck, Expo export, deterministic package installation,
  repository validation, and CI are required before publication.

## Rollback

Before a future Expo release, rollback is the previous source commit and package lock containing the handwritten
converter. No backend image, database, cache, event, provider, or production resource changes in this task.

Do not restore client-side conversion for released v1 compatibility. Existing released clients keep their own bundle,
and their snake_case contract remains owned by the server-side MRG-304 adapter. A future current-app regression should
be fixed at the canonical contract or generated mutator boundary.

## Closed Scope

- MRG-304 retains the production observation and retirement gate for every v1 route and adapter.
- MRG-354 owns the repository-wide allowlisted casing guard.
- MRG-501 owns later mobile provider and unused-code architecture cleanup.
- No form migration, Expo release, deployment, production observation, v1 retirement, MRG-9xx, or MRG-1000 work is
  performed or authorized.
- The active goal stops successfully before Phase MRG-900.
