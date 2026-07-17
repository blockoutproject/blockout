# MRG-377 OpenAPI Standard Syntax Normalization

- Status: implemented in the monorepo shadow baseline
- Owners: REST contract sources and generated boundaries
- Runtime effect: none
- Production effect: none

## Purpose

MRG-377 removes contract metadata that duplicated generator or authorization knowledge without changing any approved
route, payload key, constraint, operation identifier, security boundary, response, or coexistence rule. Blockout REST
sources now use the same standard-first style as the Maaatch reference: the schema itself describes the wire, while
generator configuration and runtime security own implementation concerns.

## Approved Syntax

Positive numeric identifiers are declared at their point of use:

```json
{
  "type": "integer",
  "format": "int64",
  "minimum": 1
}
```

They are not exported as a `NumericIdentifier` component. This avoids an artificial generated wrapper while retaining
the exact positive `int64` wire constraint. Nullable identifiers use the same scalar shape plus the existing
`nullable` compatibility marker.

The source and generated REST bundles forbid:

- `x-java-type`;
- `x-required-scope`;
- `x-required-scopes`;
- `x-required-scopes-by-entity-type`;
- references to, or declaration of, `NumericIdentifier`.

Native Java scalar mappings are derived only from standard OpenAPI type/format pairs. UUID, calendar-date, and UTC
date-time aliases therefore map to their generator-native Java types without embedding Java package names in the
language-neutral contract.

## Security Ownership

The cleanup does not remove authorization. Every deployable REST bundle retains the standard HTTP Bearer security
scheme, operation-specific public overrides, and explicit authentication/authorization error responses. Runtime
security configuration remains the authority for scope checks, including entity-type-dependent favorite permissions
that cannot be expressed accurately by a static OpenAPI scope extension.

The removed extensions were documentation duplicates, not runtime enforcement. Later migration tasks must preserve
the audited runtime scope matrix and may not infer relaxed access from their absence in the OpenAPI document.

## Generated Boundaries

All REST bundles, backend schema mappings, Expo Orval models/hooks/Zod schemas, and the six Python client namespaces are
regenerated from the normalized sources. Generated languages receive their native scalar representation directly:

- Java uses `Long` for inline `integer`/`int64` identifiers;
- TypeScript uses `number`;
- Python uses `int` while generated aliases continue to translate Python snake_case identifiers to camelCase wire
  keys.

The Python files remain outputs of OpenAPI Generator `7.23.0`; no model, endpoint, serializer, authentication path, or
transport is handwritten. MRG-378 separately replaces the interim generated aiohttp client library with OpenAPI
Generator's supported asynchronous `httpx` library before either scraper migrates its calls.

## Compatibility And Rollback

This task changes source syntax and regenerated representations only. REST v1/v2 routes, camelCase wires, legacy
adapters, BFF behavior, Expo behavior, scraper behavior, runtime authorization, RabbitMQ, persistence, and production
authority are unchanged.

Before any later runtime slice, rollback remains the prior monorepo commit and its generated artifacts. No standalone
image, store build, production image, deployment configuration, or Maaatch file is changed.

## Verification Gate

Publication requires proof that:

- all 130 REST operation identifiers and their paths remain reconciled;
- every bundle retains standard Bearer security and the existing explicit response contracts;
- source and generated bundles contain no forbidden metadata or numeric wrapper;
- Java, Expo, and Python generation is deterministic;
- generated Java, TypeScript, Zod, and Python consumers compile or typecheck;
- Android and iOS exports remain successful;
- documentation, source lint, Maaatch comparison, and whitespace checks pass.
