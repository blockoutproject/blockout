# Document shapes

Use the same applicable headings across projects so the same kind of information is easy to find. Omit irrelevant optional sections and empty rows; do not create companion files merely to complete this catalogue. Repository language and real paths come from the project.

## Architecture

Use `assets/architecture.md` from this skill. Scope and status identify the target and the decisions' authority. The stack records selected technologies by responsibility, not every dependency. Runtime boundaries explain applications/services, owned responsibilities and communication; they do not prescribe microservices or a module per entity. Technical constraints contain only cross-cutting constraints needed to coordinate work. Decision sources link authoritative detail and useful rationale.

When some choices remain open, mark the specific uncertainty without inventing a target. If there are no shared technical choices to document, do not create the file yet.

## Development

Use `Prerequisites`, `Local setup`, `Run and verify`, and, when actual recurring problems warrant it, `Troubleshooting`.

Document tools/configuration required to work on the existing tree, then the supported setup and verification entry points. Prefer references to maintained scripts over copying their internals. Use environment variable names and safe examples, never credential values. Mark instructions not yet verified as such. Do not invent commands for an uninitialized runtime, duplicate the root README, or turn human onboarding into agent policy.

## Operating procedure

Use a descriptive title and `Purpose and applicability`, `Prerequisites`, `Procedure`, `Verification`, and `Failure and recovery`.

State the supported environment and authorization requirements where they matter. Give the actual actions and observable success conditions. Explain a safe stopping point and known recovery limits rather than promising automatic rollback or restoration. Link the owning configuration or scripts. If a procedure is only planned, identify that status and qualification gap; writing it does not authorize execution. Do not create speculative runbooks for hypothetical incidents.

## Shared integration

Use `Purpose and ownership`, `Configuration`, `Constraints and failure behavior`, and `Verification and sources`.

Explain which components use the provider, which source owns its contracts, and the shared setup that consumers need. Include only relevant provider limits and supported behavior, with official sources when relied upon. Link authoritative API schemas and feature plans rather than reproducing them. Distinguish documented capability from qualification in this project. Record secret names or secure retrieval instructions, never secrets themselves.

## Design references

Use `Authorities`, `Coverage and status`, and `Review references`.

Identify the actual prototype and design library/screen sources, their roles and applicable scopes. Link the existing review or acceptance records, including an exact revision when that record establishes one. A prototype, an approved Figma screen and a native implementation establish different evidence. Do not invent approval, copy a screen inventory already maintained elsewhere, or make this file a second tracker.

If only a partial prototype exists, describe that actual scope and link it. An absent Figma file needs no placeholder link or creation task. For a purely technical documentation change, existing design remains untouched unless an actual impact is established.

## Navigation

A `docs/README.md` contains short purpose-labelled links to existing documents and, when useful, their owning external systems. No duplicate stack table, roadmap, status dashboard or summaries that need independent maintenance.
