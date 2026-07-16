# Blockout REST Pagination Policy

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

Read this reference before changing a collection, list, pagination parameter, `PageInfo` schema, or paginated
client/backend mapping.

## V1 Standard

Growable or volumetric V1 collections use simple, deterministic pagination oriented toward "load more" flows.

- Response wrapper: `items` + `pageInfo`, named with a `PageResponse` suffix.
- Query params: zero-based `page`, bounded `pageSize`.
- `pageInfo.page`, `pageInfo.pageSize`, and `pageInfo.hasNext` are required.
- `hasNext` is always guaranteed.
- `totalItems` is optional by default.
- Every paginated endpoint documents deterministic default ordering with a stable tie-breaker.
- Filters stay explicit query params only when they are simple, stable, and already needed by the product.
- Do not add a generic `sort`, `filter`, or query-language DSL by default.

## ListResponse vs PageResponse

- `*ListResponse` means a complete unpaginated list: `items` only, no `pageInfo`, and no `page` / `pageSize` query
  params.
- Use `*ListResponse` only for bounded catalogs or reference data where returning the full collection is an intentional
  product/API decision.
- A `*ListResponse` operation still documents deterministic ordering and the bounded source that makes the complete
  list acceptable.
- `*PageResponse` means a paginated list: `items` + `pageInfo`, with zero-based `page` and bounded `pageSize`.
- If a collection can grow with user, competition, tenant, audit, or sporting runtime data, use `*PageResponse`.
- If the bounded-vs-volumetric source is unclear, choose `*PageResponse` or stop for product/architecture revalidation.

## `totalItems`

Guarantee `totalItems` only when:

1. the UI or integration truly needs an exact count;
2. the backend can compute it correctly and cheaply with the same filters, rights, and BFF compositions.

Otherwise, drive navigation with `hasNext`.

## Stable Ordering

Offset pagination requires stable ordering. Always add a tie-breaker, usually an immutable id.

Examples:

- `createdAt desc, id desc`
- `displayOrder asc, id asc`
- `roundNumber asc, id asc`
- `recordedAt desc, id desc`

Without a tie-breaker, pages may duplicate or lose items when data changes.

## BFF And Services

- Services may use `PageRequest`, `Slice`, or `Page` internally, but map to Blockout DTOs at the boundary.
- Prefer `Slice` behavior when only `hasNext` is useful; do not force a count query for Spring convenience.
- The BFF owns the frontend projection and may impose a lower max `pageSize`.
- Expo clients read `items` and `hasNext` by default. Exact pages exist only when `totalItems` is
  guaranteed.

## Cursor Pagination

Cursor pagination may be added later for feeds, highly mutable lists, or mobile infinite scroll. It is not the V1
default.

Do not mix page and cursor on the same operation without an explicit migration plan.

## Completion Check

- Paginated wrapper named `*PageResponse`, not a raw array, framework type, or `*ListResponse`.
- `*PageResponse` includes `items` + `pageInfo`; `pageInfo.hasNext` is required and guaranteed.
- `*PageResponse` keeps `totalItems` optional unless explicitly guaranteed.
- `*PageResponse` operations declare aligned `page` / `pageSize` params and expected invalid-shape errors.
- Complete-list wrapper named `*ListResponse`, with `items` only and no `pageInfo`.
- `*ListResponse` operations do not expose `page` / `pageSize`.
- Stable order documented; paginated endpoints need a stable tie-breaker.
- No speculative generic filter or sort.
- Generated files regenerated through contract-first, never hand-edited.
