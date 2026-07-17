# MRG-354 Repository Wire-Casing Guard

- Status: implemented in the monorepo baseline
- Owner: repository contract and transport policy
- Canonical Blockout wire format: camelCase
- Guard command: `npm run validate:wire-casing`
- Production effect: none

## Purpose

MRG-354 adds one executable repository guard after the REST, event, Expo, and scraper caller migrations and casing
cleanup have completed. The guard rejects non-canonical Blockout-owned wire names before they can enter contracts,
generated clients, handwritten boundaries, or active application transport.

The allowlist schema is closed to four compatibility categories:

1. isolated server-side v1 adapters retained by MRG-304;
2. database names that remain snake_case persistence details;
3. Python identifiers whose generated wire aliases remain camelCase; and
4. exact external-vendor payload files and keys.

Unknown categories, broad directory exceptions, missing files, duplicate vendor entries, and stale exceptions fail.

## Guard Coverage

### REST and events

The guard walks both source and generated OpenAPI and AsyncAPI JSON. Every schema property and query, path, or cookie
parameter must match canonical camelCase. The current baseline covers 174 files and 2,979 names.

MRG-315's explicit `x-blockout-*` AMQP headers are protocol metadata, not JSON envelope or payload properties. They
remain governed by the event-contract decision and golden tests while every event body key is checked here.

### Backend Java

Handwritten `src/main/java` source must contain no `@JsonProperty`, `@JsonAlias`, or `@JsonNaming` adapter and no global
snake_case configuration. `PropertyNamingStrategies.SNAKE_CASE` is accepted only in the twelve exact v1 JSON adapter
files. Snake_case Spring request names are accepted only in the eleven exact v1 controller files that still own them.

Persistence annotations are classified separately and currently account for 154 database names. Maven `target`
output and generator-owned source are never mistaken for handwritten exceptions.

### Expo

The guard rejects the removed case-conversion dependencies, `transformCase`, `appendJsonSnake`, generated snake_case
model properties, and non-allowlisted snake_case object keys. Direct `fetch` is accepted only for the exact external
Expo-provider debug helper. The two `react-native-markdown-display` style keys are exact library-owned exceptions.

### Python and scrapers

Generated Pydantic aliases plus generated path and query parameter names must be camelCase; the current baseline
checks 306 wire names. Python's snake_case fields, keyword arguments, and local models remain idiomatic identifiers,
while serialization continues through generated `by_alias` clients.

Every scraper Blockout API adapter must import the generated contract package. Direct HTTP calls are rejected unless
their exact file is allowlisted as Auth0, FFVB/federation, or legacy SignalR provider traffic.

## Enforcement and Tests

`tools/scripts/validate-wire-casing.test.mjs` proves canonical acceptance, snake_case rejection, AMQP-header
separation, TypeScript key detection, allowlist-category closure, and the complete live repository. Both PR and Push CI
run the command after OpenAPI source lint and before generation.

MRG-355 owns the broader two-run generation/no-diff verification workflow. MRG-354 only installs and enforces the
wire-casing policy.

## Rollback

Rollback is the previous source commit and CI workflow without the guard. No deployable, database, event topology,
cache, provider, Expo bundle, or production resource changes in this task.

Do not weaken the allowlist to resolve a future failure. A legitimate v1, persistence, Python, or vendor exception
must name its exact owner and compatibility reason; a Blockout-owned wire regression must be corrected at its source
contract or adapter.

## Closed Scope

- MRG-304 retains the production observation and retirement gate for every v1 route and adapter.
- MRG-355 owns complete local generation and deterministic no-diff enforcement.
- No contract behavior, form migration, deployment, production observation, v1 retirement, MRG-9xx, or MRG-1000 work
  is performed or authorized.
- The active goal stops successfully before Phase MRG-900.
