# Blockout V1 Domain Model

## Authority Boundary

This document is the architectural authority for durable Blockout vocabulary, conceptual relationships, ownership,
and cross-feature invariants.

Accepted specifications and explicit human decisions are the only sources that may change this architecture. This
model does not define product journeys, screens, permissions, validation messages, endpoint shapes, or implementation
status. A concept represented here is not evidence that a product capability is exposed.

### Four Authority Layers

| Layer                   | Authority                                                                   |
| ----------------------- | --------------------------------------------------------------------------- |
| Product vision          | Product direction and principles                                            |
| Domain architecture     | Durable vocabulary, relationships, ownership, and cross-feature invariants  |
| Accepted specifications | Observable product intent, journeys, rules, and acceptance criteria         |
| Executable system       | Delivered transport and runtime behavior through contracts, code, and tests |

Each layer constrains the layers below it without replacing their authority.

### Explicitly Non-Authoritative Material

Generated transport models, persistence entities, provider records, search documents, design explorations, issue
descriptions, and implementation notes do not redefine the Blockout domain. They remain explicit projections or
evidence at their own boundaries.

## Modeling Principles

### Product Meaning Before Projection

Blockout concepts are defined by stable product meaning before service, endpoint, storage, provider, or screen
projection. Provider terminology is translated at ingestion boundaries.

### One Owner Per Complete Resource

Each complete product resource has one authoritative runtime owner. A gateway may compose views and commands without
becoming a second business-resource owner.

### Projection Is Not Authority

Rankings, search results, mobile views, notifications, and generated types are projections of authoritative state.
They never become independent write authorities.

### Identity And Deactivation

Stable identity is independent from display labels and provider payloads. Deactivation preserves identity and
relationships; it does not silently create a replacement resource.

### Competition Coherence

References between clubs, teams, pools, competition associations, and matches preserve one coherent season and
competition context.

## Semantic Data Roles

### Durable State

Stable identities, owned relationships, lifecycle state, user preferences, and explicit product decisions are
durable state.

### Official Competition State

Standings preserve the official source positions, row order, tied ranks, points, penalties and supplied statistics
for one pool and season. Blockout does not calculate ranking positions, ranking statistics or alternative tie-breaks
from match results. Display formatting does not create new sporting facts.

### Provider Evidence

Provider identifiers, payloads, observations, and reconciliation evidence remain inside provider adapters. A complete
and structurally valid observation is required before missing-resource deactivation can be authorized.

### Derived Projection

Search documents, ranking views, mobile read models, and notification delivery state are derived projections with an
explicit source and refresh path.

## V1 Capability Boundaries

### Modeled Within V1

V1 models clubs, divisions, teams, pools, competition associations, rankings, matches, users, favorites,
notifications, reports, provider ingestion, and mobile-facing composition. Their presence defines shared meaning, not
automatic product exposure.

### Explicitly Deferred

Any additional competition format, audience relationship, moderation workflow, or provider capability requires an
accepted specification and an explicit extension of this model when it changes shared meaning or invariants.

### Outside V1

This model does not authorize product journeys, screens, permissions, validation messages, endpoint shapes, or
implementation status.

## Competition Model

```text
Club
  -> Team
       -> Competition Association <- Pool -> Match
                                        \-> Ranking

User -> Favorite -> Team | Pool
User -> Notification
User -> Report
```

### Club

A `Club` is the stable organization represented in Blockout. It owns its identity and presentation information and is
the parent of its teams. A provider identifier may identify a club at an ingestion boundary, but provider payloads do
not define the Blockout concept.

### Division

A `Division` is the normalized competitive category shared by teams and pools. Provider labels resolve through
explicit mappings before they become a Blockout division reference.

### Team

A `Team` represents one club team for a season, division, format, and gender. It belongs to exactly one club and may
participate in several pools through explicit competition associations.

### Pool

A `Pool` is a competition grouping for a season, league, division, format, and gender. It contains associations,
matches, and a ranking projection. Pool identity is independent from its display name.

### Competition Association And Ranking

A `CompetitionAssociation` associates one team and its club with one pool and owns that membership. A `Ranking`
is the display projection of an official standing snapshot for that pool and season, with rows referring to identified
teams. It preserves source positions, row order, ties and supplied statistics; it does not own teams or pools or derive
standings from match results. An unavailable ranking does not invalidate a usable calendar. Snapshot collection time
and the source's own update time are distinct provenance.

### Match

A `Match` is a scheduled contest between exactly two teams in one pool and season. It owns its schedule, status,
venue, officials, score, set information, and active state. Live-viewing information is attached through a separately
moderated live link and never changes the sporting result.

A schedule distinguishes a trustworthy precise instant from a civil date whose time is unknown. Its source timezone
is interpretation context, separate from the viewer's display timezone. A date-only schedule never implies midnight.
The [rebuild specification](../../specs/002-backend-rebuild/spec.md) owns device-timezone presentation, unknown-time
states, calendar selection, and time-based authorization behavior; the [target architecture](backend-rebuild-architecture.md)
derives their storage and transport representation.

## Audience Model

### User And Identity

A `User` is the stable Blockout account associated with an external identity by issuer and subject. Email and provider
claims are account attributes, not the durable identity key. Blockout owns roles, permissions, preferences, and
product authorization.

### Favorite

A `Favorite` is a unique relationship from one user to one supported team or pool. It expresses the user's interest
in that target without transferring ownership of the target.

### Notification

A `Notification` is a user-owned message with an explicit type, read state, and optional typed product target. Device
push tokens are delivery addresses for a user and do not become identity or authorization sources.

### Report

A `Report` is a user submission with an explicit report type, title, optional description, and applicable diagnostic
context. Reports support review workflows and do not directly mutate a product resource.

## Logical-Persistence Requirements

### Identity And Uniqueness

Durable product identity uses Blockout-owned keys and explicit uniqueness rules. Provider keys are scoped to their
source and never substitute for product identity.

### Calculated And Derived Information

Calculated values and derived projections identify their authoritative inputs and remain reproducible. They do not
silently become durable domain facts.

### Cross-Feature Integrity

Plans that affect shared concepts preserve resource ownership, season and competition coherence, external identity
mapping, deactivation semantics, and projection boundaries.

## Shared Model Change Protocol

A specification or plan that changes shared vocabulary, identities, relationships, ownership, lifecycle semantics,
or cross-feature invariants must identify the affected concepts and update this document through explicit human
approval before implementation.

## Purification Guard

Provider, transport, persistence, search, and presentation concerns may project the model but must not leak back into
its product meaning. New abstractions require a present accepted need and a declared authoritative owner.
