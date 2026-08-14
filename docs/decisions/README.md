# Durable Decisions

This directory contains decisions that constrain future product or technical work and cannot be derived safely from
the current implementation alone. It never tracks tasks, status, priority, owners, dependencies, or delivery evidence.

Use GitHub issues for operational work. Read only the domain decision required by the selected issue:

- [Foundation decisions](foundation/README.md): contract authority and resource ownership.
- [Ingestion decisions](ingestion/README.md): provider evidence and destructive-reconciliation safety.
- [Mobile decisions](mobile/README.md): mobile application boundaries and canonical visual authority.

Completed-task history, validation logs, and delivery proof belong to the owning issue, pull request, and Git history.
