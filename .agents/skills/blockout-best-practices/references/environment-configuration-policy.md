# Environment Configuration Policy

## Ownership

Each deployable owns one `.env.example` next to its runtime entrypoint. It documents the complete current environment
contract with safe development-shaped values.

## Rules

- Include every variable read by Spring placeholders, Python environment access, Expo configuration, Docker Compose,
  Docker build arguments, and runtime scripts.
- Keep real `.env`, `.env.local`, `.env.dev`, Firebase JSON, private keys, and service-account files ignored.
- Use `change-me`, empty public SDK values, or local URLs. Never copy production values into examples.
- Document optional values through comments or safe defaults; do not silently omit them.
- Spring services copy the example to `.env.local` for direct local execution. Applications are not launched by the
  centralized Compose files.
- `SERVER_PORT` is retained in backend examples for legacy deployment parity; current Spring listening ports remain
  fixed in each service's `application.yaml`.
- Scrapers copy the example to `.env`; proxy credentials remain secrets.
- Expo only exposes values prefixed with `EXPO_PUBLIC_`. Treat all such values as publicly readable.
- `GOOGLE_SERVICES_JSON` is a local or CI path to an ignored file, not JSON content.

Any environment change must update source configuration, the owning example, Compose or workflow wiring when
applicable, and migration documentation when production must be updated.
