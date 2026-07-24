# Foundation Decisions

The following decisions are active:

- Source OpenAPI fragments are the transport authority.
- Generated Java, TypeScript, and Python artifacts are outputs and remain isolated at adapter or client boundaries.
- Each complete business resource has one owning service.
- Complete mirrors agree with the owner; purpose-specific events and projections remain explicitly smaller.
- Persistence, provider, transport, application, and presentation models stay distinct.

The current ownership map lives in
[`blockout-system-model-v1.md`](../../architecture/blockout-system-model-v1.md). Repository-wide implementation rules
live in the Blockout best-practices skill, not in this decision index.
