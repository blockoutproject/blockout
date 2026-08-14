# Testing And Validation

Choose validation from changed boundaries and credible failure modes. Use the smallest checks that prove the change,
but never replace required integration evidence with unit tests.

- Documentation or policy: format, links, targeted consistency searches, and diff hygiene.
- OpenAPI or generation: bundling, contract tests, reproducibility, schema-mapping stability, Java generation and compilation, Python generation and package verification, and TypeScript generation and type checking.
- Backend Java: focused tests while iterating, the owning module suite, then `./mvnw -f apps/backend/pom.xml verify`. Follow `java-testing.md`.
- Persistence or infrastructure: the applicable Testcontainers integration tests in addition to focused unit tests.
- Expo mobile: focused tests, generation, formatting, lint, type checking, and export. Follow `mobile-testing.md`.
- Python scraper: focused tests, offline fixtures, syntax and lint checks, then the owning scraper verification target. Follow `python-scraper-testing.md`.
- Cross-service path: the maintained smoke proof when routing, mapping, serialization, or failure propagation changes.
- Configuration or CI: syntax validation plus one representative command through the changed execution path.
- Native or provider boundary: Expo Doctor and the relevant local build, simulator, device, or controlled service smoke.

Always run formatting, `git diff --check`, ignored-output checks, and a final worktree check. Report skipped checks with the concrete reason and the remaining risk; never describe an unrun check as passing.
