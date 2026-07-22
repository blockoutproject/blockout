# REF-059 Contract-First Certification

## Scope

REF-059 certifies the current V1 application after the Java, Python, and TypeScript consumers adopted their generated
transport boundaries. It does not add a V2 API, a compatibility layer, a production bypass, CI, deployment, or GitFlow.

The final cleanup removed the remaining handwritten Competition ranking mirrors from `mobile-gateway` and the
handwritten Team and Pool transport mirrors from `notification-service`. Generated transport models now remain inside
HTTP adapters and are reduced to small application-owned views. No generated source is tracked by Git.

## Deterministic generation and artifacts

- Two clean full generations produced the same aggregate SHA-256:
  `0ee68453658c644cd9db579a5008f6793f99c23c332db3545f751fc11ad7a7ce`.
- All six contract tests passed, including the generated-file and handwritten transport ownership guards.
- The shared Python workspace passed `uv lock --check`, `uv sync --locked --all-packages`, and all eight generated-client
  tests with uv 0.11.29.
- The Python contract-client wheel built successfully and imported from an isolated virtual environment.
- The complete Maven reactor packaged all 13 Java modules. The full non-smoke test reactor passed with zero failures.
- `npm audit --audit-level=high` reported no high or critical vulnerability.

## Application matrices

- Club scraper: Ruff format and lint checks, syntax check, and 37 tests passed.
- Competition scraper: Ruff format and lint checks, syntax check, and 71 tests passed.
- Backend: all service test reports passed with zero failures; the gateway contributed 18 passing tests and the
  notification service contributed four.
- Mobile: lint, typecheck, all 27 Jest suites and 56 tests, and the 3,138-module Expo Web export passed.
- Expo Doctor passed all 19 checks. Clean Expo prebuild succeeded, as did the unsigned Android debug build and the
  unsigned arm64 iOS Simulator debug build. Generated native projects and build outputs were removed after validation.

## Local functional proof

The certification used the existing local PostgreSQL, RabbitMQ, and Elasticsearch containers without changing their
volumes. Five disposable databases were created for the current Team, Config, Club, Competition, and Match service JARs,
then dropped after the proof.

An authentic FFVB club fixture was parsed by the Club scraper and persisted through its generated Python client. A Team
was persisted and read through the Competition scraper's generated Team client. The gateway then assembled the public
team resource through Java adapters using generated contract models. Finally, Expo Web loaded `/team/1` at a 390 by 844
viewport through the generated Orval client and displayed the expected club, division, format, gender, season, and
empty-match state.

This proves the local path from an authentic provider payload through scraper parsing, generated Python clients, fresh
Flyway persistence, Java adapters backed by generated contract models, gateway aggregation, generated TypeScript
transport, and the mobile UI. No authentication, network, storage, or production bypass was introduced.

## Evidence boundaries

- Live external-provider reads remain covered by the REF-026 and REF-027 characterization evidence. REF-059 did not
  mutate an external provider.
- The local proof used the existing Auth0 tenant with local machine-to-machine credentials; no secret or credential is
  tracked or recorded here.
- Signed physical-device, store-distribution, and production-deployment evidence is unavailable and outside this local
  certification. Both unsigned native compilation paths are proven.
- Existing long-lived local databases contain historical Flyway checksum mismatches. They were left untouched; fresh
  disposable databases proved the current migrations instead of repairing or resetting user data.
