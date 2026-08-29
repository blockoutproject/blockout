# Blockout V1 Domain Model

## Authority Boundary

This document is the architectural authority for durable Blockout vocabulary, conceptual relationships, ownership,
and cross-feature invariants.

Accepted specifications and explicit human decisions are the only sources that may change this architecture. This
model does not define product journeys, screens, permissions, validation messages, endpoint shapes, or implementation
status. A concept represented here is not evidence that a product capability is exposed.

Contracts, source code, and tests own delivered transport and runtime projections. Product specifications own
observable intent.

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

A `CompetitionAssociation` associates one team and its club with one pool. It owns the active association and the
competition statistics used to produce that pool's ranking. Ranking is a projection of the associations in one pool,
not a second owner of teams or pools.

### Match

A `Match` is a scheduled contest between exactly two teams in one pool and season. It owns its schedule, status,
venue, officials, score, set information, and active state. Live-viewing information is attached through a separately
moderated live link and never changes the sporting result.

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

## Invariants

- Each complete product resource has one authoritative owner.
- References between clubs, teams, pools, associations, and matches preserve one coherent season and competition
  context.
- Provider records are evidence at ingestion boundaries and are mapped explicitly into Blockout-owned concepts.
- Search results and rankings are derived projections and never independent write authorities.
- The mobile gateway composes mobile-facing operations without owning the underlying product resources.
- Deactivation preserves identity and relationships; it does not silently create a replacement resource.
- Generated transport models, persistence entities, provider records, and product concepts remain distinct.
