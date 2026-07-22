# REF-060 Public Release Readiness

## Current tracked tree

The current tracked tree is suitable for publication as source-visible code:

- all 15 deployable applications own a committed `.env.example`;
- all 15 ignored `.env.local` files contain the same key set as their example, contain no placeholder, and use owner-only
  file permissions;
- local environments, generated sources, caches, build outputs, signing material, and private keys are ignored;
- generated-file ownership guards pass and no generated source is tracked;
- Gitleaks 8.30.1 reports only the expected public Auth0 client identifiers and Google mobile application keys;
- no private credential, production token, private key, or local environment file is tracked;
- the public README, documentation index, local runbook, and private vulnerability reporting path describe the current
  repository.

OAuth client IDs, OAuth audiences, application domains, Google mobile application keys, ad test unit identifiers, and
EAS project metadata are public client configuration. Provider secrets, machine credentials, signing keys, session
exports, and user data remain private.

## History boundary

The existing construction history must not be made public. A full-history Gitleaks scan found one legacy Auth0
client-secret-shaped value in an imported historical configuration. The current tree no longer contains that value,
but deletion from a later commit would not remove it from Git history.

Before publication:

1. rotate or revoke the legacy credential if its provider registration still exists;
2. initialize the public repository from the certified current tree without the construction history;
3. rerun a tracked-tree secret scan before the first public push.

REF-060 does not rewrite history, rotate an external credential, change repository visibility, or publish the source.
Those are explicit owner or provider operations.

## License boundary

No `LICENSE` file is present because selecting an open-source license grants legal reuse rights and remains an owner
decision. A public repository without a license is source-visible but does not grant reuse or redistribution rights.
Choose and add a license before publication only if that is the intended distribution model.

## Validation boundary

The final clean-tree check installs the npm and uv workspaces from their committed lockfiles, generates the ignored
OpenAPI bundles, builds the complete Maven reactor, inspects the Nx project graph, verifies contract ownership guards,
and checks documentation formatting. It does not add GitFlow, CI, deployment, production configuration, or a runtime
behavior change.

The indexed clean-tree export passed `npm ci`, `uv lock --check`, `uv sync --locked --all-packages`, OpenAPI bundle
generation, discovery of all 20 Nx projects, all six contract guards, and packaging of all 13 Maven artifacts. The two
scraper suites retain 108 passing tests, and the notification-service test protects startup with optional enhanced Expo
push security. Documentation formatting and Git diff checks pass. `npm audit --audit-level=high` reports no high or
critical vulnerability; its 22 moderate findings are transitive, and the proposed forced updates would cross the
supported Expo or plugin dependency ranges.
