# Blockout Agent Infrastructure

`blockout-best-practices` is the project entrypoint and adapts the Maaatch agentic operating model to Blockout.

The reusable structure was imported: repository router, scoped policies, current context, task runbooks, audit/execution
pairs, GitHub issue templates, a compact Roadmap reader, `karpathy-guidelines`, `no-use-effect`, and the generic Nx
workspace patterns. Maaatch product models and technology-specific Next.js,
Logto, shadcn, Figma, and OpenAPI-contract policies were intentionally not copied because they are not authoritative for
the current Blockout stack.

Add a specialized skill only when the repository adopts the matching technology or a recurring workflow proves the
need.
