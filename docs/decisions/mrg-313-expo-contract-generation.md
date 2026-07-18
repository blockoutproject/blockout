# MRG-313 — Expo Contract Generation And Form Architecture

- Status: approved
- Decision date: 2026-07-17
- Runtime effect: none; MRG-313 changes documentation and future task structure only
- Applies to: `apps/frontend/mobile`
- Supersedes: the temporary decision to retain Formik and Yup as the target mobile form stack

## Decision

Blockout Expo uses a mobile-owned generated boundary built with Orval, Axios, TanStack Query, and Zod. Mobile forms use
React Hook Form with handwritten Zod form schemas. Formik and Yup are transition-only dependencies until every editable
form has migrated and MRG-516 removes them.

The selected versions are exact:

| Package                 | Version     | Role                                                      |
| ----------------------- | ----------- | --------------------------------------------------------- |
| `orval`                 | `8.22.0`    | mobile-gateway operations, DTOs, hooks, and wire schemas  |
| `zod`                   | `4.4.3`     | generated wire schemas and handwritten form schemas       |
| `react-hook-form`       | `7.72.0`    | React Native form state and controlled-field coordination |
| `@hookform/resolvers`   | `5.2.2`     | Zod resolver for React Hook Form                          |
| `axios`                 | existing    | transport behind the handwritten Orval mutator            |
| `@tanstack/react-query` | existing v5 | remote-state ownership and generated query integration    |

The workspace remains on Node 22. Orval v8 requires modern ESM and Node 22.18 or newer; the current local Node 22 and
CI `node-version: 22` meet that floor. MRG-328 must retain the Node 22 CI contract.

## 1. Ownership

All generated Expo artifacts and every runtime collaborator around them remain inside `apps/frontend/mobile`.
Blockout has one React application, so there is no shared TanStack, Orval, query-client, mutator, or form package.

| Boundary                  | Owner                                     | Responsibility                                                                     |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| OpenAPI source            | `libs/shared/contracts`                   | canonical mobile-gateway v2 wire contract                                          |
| Orval configuration       | `apps/frontend/mobile/orval.config.ts`    | deterministic mobile output configuration                                          |
| generated operations      | `src/api/generated/mobile-gateway`        | DTOs, operations, query keys, TanStack hooks, and wire Zod schemas                 |
| transport mutator         | `src/api/core/orvalAxios.ts`              | Axios, BFF base URL, Auth0 token, cancellation, errors, and one 401 boundary       |
| QueryClient               | existing mobile provider boundary         | one application singleton and current cache defaults                               |
| handwritten domain hooks  | owning `src/hooks/<domain>/**`            | real composition, projection, pagination, invalidation, and optimistic policy      |
| central form API          | `src/forms/index.ts`                      | allowlisted React Hook Form, resolver, and Zod imports                             |
| form schema and transform | owning form/domain                        | user input, UX validation, defaults, coercion, messages, and generated request map |
| React Native form UI      | owning form plus `components/common/form` | controlled fields, feedback, sheets, selectors, images, colors, and focus          |

Generated DTOs never become form state, route state, persisted state, or general screen models. Generated wire schemas
validate transport data; they do not own input coercion, form messages, touched behavior, or cross-field UX rules.

## 2. Orval Configuration

MRG-328 creates the `@blockout/mobile:codegen` Nx target. It depends on generation of the ignored
`mobile-gateway.json` bundle and invokes `apps/frontend/mobile/orval.config.ts` with these two outputs:

| Output               | Required configuration                                                                                    | Directory                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| operations and hooks | `client: "react-query"`, `httpClient: "axios"`, `mode: "tags-split"`, `clean: true`, custom Axios mutator | `src/api/generated/mobile-gateway/endpoints` |
| models               | schemas/models for the React Query output                                                                 | `src/api/generated/mobile-gateway/models`    |
| wire schemas         | second output with `client: "zod"`, `mode: "tags-split"`, `clean: true`, `fileExtension: ".zod.ts"`       | `src/api/generated/mobile-gateway/schemas`   |

The input is `libs/shared/contracts/generated/specs/mobile-gateway.json`. Output paths are relative to the mobile
project. The target owns all three ignored generated directories, formats them deterministically, and must prove two
clean generations produce identical content. A repository guard rejects any attempt to track generated output.

This output policy was amended by MRG-431 to match Maaatch. The earlier committed-output decision is superseded; only
the OpenAPI sources, Orval configuration, handwritten mutator, and deterministic generator entrypoints belong in Git.

MRG-328 does not create a second QueryClient, a generated transport singleton, a form abstraction, or React Native UI.
It does not enable runtime response validation globally. A caller uses a generated Zod wire schema only where the
owning boundary requires runtime validation.

## 3. Axios Mutator

`src/api/core/orvalAxios.ts` is handwritten and never generated. It replaces the current transport incrementally while
preserving the behavior of each migrated call. It owns:

- the canonical mobile-gateway v2 base URL from current public Expo configuration;
- the existing Auth0 token supplier and Authorization attachment;
- repeated query-parameter serialization;
- the current 20-second default timeout unless a migrated operation already proves another value;
- Axios cancellation and the signal/cancel contract emitted by Orval;
- response-body extraction expected by generated React Query operations;
- one normalization path to the existing mobile-owned `ApiError`;
- Problem Details `status`, stable `code`, safe request identifier, and safe fallback mapping;
- exactly one unauthorized callback path for `401` responses.

The mutator never performs snake_case/camelCase conversion, implicit retry, TanStack invalidation, navigation, screen
feedback, form error placement, or product-specific projection. Provider/vendor casing remains outside this BFF
mutator. MRG-353 removes the old case converters only after every BFF v2 caller is active.

## 4. TanStack Query Integration

The existing mobile QueryClient remains the single application instance. MRG-328 and later generated-client tasks do
not change global retry, stale time, garbage collection, cache clearing, or refetch defaults.

A generated hook may be consumed directly only when its query key, enablement, pagination, error, selection, and
invalidation behavior exactly matches the current workflow. A handwritten domain hook remains mandatory when it owns
one or more of:

- composition of several operations;
- DTO-to-view projection;
- pagination or page flattening;
- cache invalidation across related workflows;
- optimistic updates and rollback;
- normalization of unordered query-key inputs;
- authentication/session cache policy;
- non-trivial enabled, fallback, or partial-result behavior.

Handwritten hooks use generated operations, request types, response types, and query-key helpers rather than recreating
transport DTOs.

## 5. Central Form API

MRG-329 installs the approved form dependencies and creates `src/forms/index.ts`. Migrated forms import form and schema
APIs only from this module. The initial export allowlist is:

- values: `useForm`, `useFormContext`, `useController`, `useWatch`, `Controller`, `FormProvider`, `zodResolver`, `z`;
- React Hook Form types: `Control`, `ControllerRenderProps`, `DefaultValues`, `FieldErrors`, `FieldPath`, `FieldValues`,
  `SubmitHandler`, `UseControllerProps`, `UseControllerReturn`, `UseFormProps`, and `UseFormReturn`;
- Zod types: `ZodSchema`, `ZodType`, and `infer` re-exported as `ZodInfer`.

The allowlist may expand only when an active migrated form proves a missing public type. It must not re-export DOM
helpers, Maaatch Server Action types, shadcn components, or Next.js conventions.

React Native fields use `Controller` or `useController`. They do not copy Maaatch HTML wrappers and do not use
`register` as if a native input were a DOM input. `FormProvider` and `useFormContext` are used only when a real nested
form subtree needs shared control.

## 6. Three Distinct Form Shapes

Every migrated form keeps these shapes separate:

1. generated Zod wire schema — validates canonical API input or output;
2. handwritten Zod form schema — owns user input, coercion, trimming, nullable UI values, messages, and UX rules;
3. generated request type — the output target of an explicit submission transform.

Form values use `z.infer<typeof formSchema>`. A named, typed transform constructs the generated request. A form never
casts its values to a generated request and never uses a generated DTO directly as form state. API-to-form defaults and
form-to-request submission transforms remain separate when create/update or null/omission semantics differ.

Each form explicitly chooses its React Hook Form `mode`, default values, resource-change reset, dirty/touched semantics,
and `canSubmit` calculation to preserve existing behavior. There is no global mode or submission policy.

## 7. React Native Form Primitives

Existing primitives under `components/common/form/**` migrate incrementally to `fieldState.error` and
`fieldState.isTouched`. A controlled wrapper is created only after real reuse is proven. Selectors, color pickers,
image pickers/manipulators, multipart assembly, and bottom sheets remain orchestrated by their owning form.

Every migration preserves the existing sheet boundary:

- `onRegisterSubmit` and `onStateChange`;
- loading, disabled, and `canSubmit` behavior;
- `accentColor` where present;
- keyboard, focus, safe-area, and close-after-success behavior;
- current haptics and visible success/error feedback;
- server error placement, including field errors such as profile conflict `409`;
- image previews, selectors, colors, and multipart file ownership.

`MatchLiveLinkDeleteForm` remains a handwritten confirmation flow. It has no editable field, so introducing React Hook
Form would add state without a form contract.

## 8. Transition And Enforcement

Until MRG-329, React Hook Form and Zod are approved but planned: they are not installed and no runtime import is valid.
After MRG-329, they are the only allowed stack for a new form and for any extension of a migrated form.

Formik and Yup remain installed only for forms not yet migrated. They may receive a narrowly required parity fix, but
no new form and no new field in a migrated form may use them. MRG-516 removes both dependencies, remaining imports,
obsolete helpers, and adds an allowlist-free repository guard that rejects their reintroduction.

## 9. Migration Sequence

| Task    | Form                      | Required parity                                                                                                   |
| ------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| MRG-333 | `LegalDocumentForm`       | title, version, Markdown content, messages, external submit registration, footer state, generated BFF client      |
| MRG-507 | `ClubForm`                | name/trim, logo selection/manipulation, preview, multipart, haptics, create/update                                |
| MRG-508 | `TeamForm`                | name, short name, logo, preview, multipart, create/update                                                         |
| MRG-509 | `PoolForm`                | name, short name, trim, footer state, create/update                                                               |
| MRG-510 | `DivisionForm`            | create/update, logo, four colors, color pickers, preview, footer `accentColor`                                    |
| MRG-511 | `RawDivisionMappingForm`  | migration from manual state, nullable values, three selectors, division loading, current submission behavior      |
| MRG-512 | `MatchLiveLinkForm`       | URL, time window, create/update, copy, errors, haptics, submission gating                                         |
| MRG-513 | `MatchLiveLinkReportForm` | reason, exact constraints/messages, errors, external submission                                                   |
| MRG-514 | `ProfileForm`             | username trim/constraints, image, preview, multipart, `409` mapped through `setError`                             |
| MRG-515 | `ReportForm`              | context-derived type, title, description, multiple images, multipart, guest/user identity, filter synchronization |
| MRG-516 | Formik/Yup retirement     | remove packages/imports/helpers and add a guard; no product behavior change                                       |

Phase MRG-500 runs MRG-501 through MRG-504, then MRG-507 through MRG-516, then MRG-505 and MRG-506. MRG-505 audits the
skills against the stack that is actually active; MRG-506 owns final Android, iOS, EAS, and installed-device evidence.

## 10. Acceptance For Every Form Migration

Every form task must prove:

- defaults and reset behavior when the edited resource changes;
- identical constraints, trimming, nullable values, and visible messages;
- errors appear only under the current touched/submitted semantics;
- identical `canSubmit`, loading, disabled, and external-submit behavior;
- a typed transform to the generated request with no cast;
- preservation of images, multipart bytes, selectors, colors, focus, haptics, and server errors as applicable;
- mobile typecheck plus Android and iOS exports;
- no Formik or Yup import in the migrated form or its migrated helpers.

Parity is captured before conversion. A task does not combine a client migration with unrelated layout, copy, cache,
validation, or interaction changes.

## 11. Roadmap Responsibility

- MRG-328 activates deterministic Orval operation/model/Zod generation.
- MRG-329 activates the form stack, central form API, and controlled primitive baseline.
- MRG-333 proves the complete generated-client and React Hook Form/Zod legal-document pilot.
- MRG-344 through MRG-347 migrate generated BFF clients and wire schemas without opportunistically migrating the
  remaining forms.
- MRG-353 removes case conversion after canonical generated clients are active.
- MRG-355 enforces all generated Expo artifacts and deterministic no-diff checks.
- MRG-501 through MRG-516 complete the form audit, architecture, migrations, retirement, skill audit, and final device
  evidence in the approved order.

The implemented legal pilot and its parity/rollback evidence are recorded in the
[MRG-333 Expo migration](../migration/mrg-333-expo-legal-document-client-form.md).

## References

- [Orval v8 migration guide](https://orval.dev/docs/versions/v8/)
- [Orval React Query client](https://orval.dev/docs/guides/react-query/)
- [Orval custom Axios instance](https://orval.dev/docs/guides/custom-axios/)
- [React Hook Form Controller](https://react-hook-form.com/docs/usecontroller/controller)
- [Zod documentation](https://zod.dev/)

MRG-313 does not install a dependency, add Orval configuration, generate a file, change Expo source, export a bundle,
or alter runtime behavior.
