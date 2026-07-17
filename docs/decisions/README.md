# Decisions

This directory owns durable Blockout product, capability, architecture, and workflow decisions.

During migration, do not move task status or validation logs here. The active migration roadmap owns temporary task
state, architecture documents own current models, and Git/CI own detailed execution evidence.

Add domain indexes only when the first real durable decision exists. Do not copy Maaatch product decisions into
Blockout by structural analogy.

## Architecture Decisions

- [MRG-313 — Expo Contract Generation And Form Architecture](mrg-313-expo-contract-generation.md)
