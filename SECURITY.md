# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or exposed credential. Report it privately to
`blockoutproject@gmail.com` with the affected component, reproduction steps, expected impact, and any safe remediation
idea. Do not include real user data, reusable tokens, passwords, or private keys in the report.

Only the current `main` branch is maintained in this repository. Public source availability does not imply that a
deployed environment, third-party provider, or historical release is supported.

## Credentials

Application-local `.env.local` files, signing material, provider credentials, and production data stay outside Git.
Committed `.env.example` files contain local defaults, placeholders, or explicitly public mobile identifiers. If a
credential is committed accidentally, revoke or rotate it before removing it from source control.
